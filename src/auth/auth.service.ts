import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Express from 'express';
import { UsersService } from '../users/users.service';
import { ActivityService } from '../users/activity.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Session } from './entities/session.entity';
import { PendingUser } from './entities/pending-user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../users/entities/user.entity';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private activityService: ActivityService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(PendingUser)
    private pendingUserRepository: Repository<PendingUser>,
    @InjectQueue('email') private emailQueue: Queue,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  // ─── Token Helpers ──────────────────────────────────────────────────────────

  private generateAccessToken(payload: { sub: number; email: string; role: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET')!,
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') as any,
    });
  }

  private generateRefreshToken(payload: { sub: number; email: string; role: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') as any,
    });
  }

  private isProd(req?: Express.Request): boolean {
    // 1. If running in dev/test environment
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return false;
    }

    // 2. Check request parameters if request object exists
    if (req) {
      const origin = req.get('origin') || '';
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return false;
      }

      const host = req.get('host') || '';
      if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
        return false;
      }

      const hostname = req.hostname || '';
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return false;
      }
    }

    // 3. Fallback to the FRONTEND_URL env check
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    if (frontendUrl.startsWith('http://localhost') || frontendUrl.startsWith('http://127.0.0.1')) {
      return false;
    }
    return frontendUrl.startsWith('https');
  }

  private get sessionDays(): number {
    return this.configService.get<number>('SESSION_DURATION_DAYS', 7);
  }

  setRefreshTokenCookie(res: Express.Response, refreshToken: string, req?: Express.Request): void {
    const isProduction = this.isProd(req);
    const maxAge = this.sessionDays * 24 * 60 * 60 * 1000;
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge,
    });
  }

  clearRefreshTokenCookie(res: Express.Response, req?: Express.Request): void {
    const isProduction = this.isProd(req);
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });
  }

  // ─── Auth Methods ────────────────────────────────────────────────────────────

  async register(createUserDto: CreateUserDto) {
    // 1. Check if user already exists in permanent table
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const { password, role, ...userData } = createUserDto; // Extract role to ignore it
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    // 3. Save to PendingUser (Upsert)
    let pendingUser = await this.pendingUserRepository.findOne({ where: { email: createUserDto.email } });
    
    const userToSave = {
      ...userData,
      password: hashedPassword,
      role: UserRole.STUDENT, // FORCE ROLE TO STUDENT FOR SECURITY (Ignores any role sent in request)
      otp,
      otp_expires_at: otpExpiresAt,
    };

    if (pendingUser) {
      Object.assign(pendingUser, userToSave);
    } else {
      pendingUser = this.pendingUserRepository.create(userToSave);
    }

    await this.pendingUserRepository.save(pendingUser);

    // Send verification email via queue (falls back to sync if Redis is down)
    try {
      await this.emailQueue.add('send-verification', {
        to: createUserDto.email,
        name: createUserDto.name,
        otp,
      });
    } catch {
      await this.mailService.sendVerificationEmail(createUserDto.email, createUserDto.name, otp);
    }

    return {
      message: 'Registration initiated. Please verify your email with the OTP sent.',
      email: createUserDto.email,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    // 1. Find the pending registration
    const pendingUser = await this.pendingUserRepository.findOne({ where: { email: verifyEmailDto.email } });

    if (!pendingUser || pendingUser.otp !== verifyEmailDto.otp) {
      throw new BadRequestException('Invalid email or OTP');
    }

    // 2. Check if OTP has expired
    if (pendingUser.otp_expires_at < new Date()) {
      throw new BadRequestException('OTP has expired. Please register again.');
    }

    // 3. Move data to permanent Users table
    const user = await this.usersService.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password, // Already hashed
      role: pendingUser.role,
    });

    // Mark as verified immediately since they just verified their email
    await this.usersService.update(user.id, { verified: true });

    // 4. Delete the pending record
    await this.pendingUserRepository.remove(pendingUser);

    return { message: 'Email verified successfully. Your account is now active.' };
  }

  async login(loginDto: LoginDto, req: Express.Request, res: Express.Response) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // This check is still good as a backup, though with the new flow they 
    // won't be in the users table unless they are verified.
    if (!user.verified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.generateAccessToken(payload);
    const refresh_token = this.generateRefreshToken(payload);

    const hashedRefreshToken = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.sessionDays);

    const session = this.sessionRepository.create({
      refresh_token: hashedRefreshToken,
      userId: user.id,
      user_agent: req.get('user-agent'),
      ip_address: req.ip,
      expires_at: expiresAt,
    });
    await this.sessionRepository.save(session);
    await this.cacheSession(session, hashedRefreshToken);

    // Explicitly update last_active_at on login so it's instantly recorded
    await this.activityService.updateLastActive(user.id);

    this.setRefreshTokenCookie(res, refresh_token, req);

    return {
      access_token,
      refresh_token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        dept: user.dept,
        code: user.code,
        profile_pic: user.profile_pic,
        points: user.points,
        preferred_theme: user.preferred_theme,
      },
    };
  }

  async refreshTokens(userId: number, rawRefreshToken: string, req: Express.Request, res: Express.Response) {
    const hashedRawToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    let currentSession = await this.getSessionFromCache(userId, hashedRawToken);

    if (!currentSession || currentSession.expires_at < new Date()) {
      if (currentSession) {
        await this.sessionRepository.remove(currentSession);
        await this.removeSessionFromCache(userId, hashedRawToken);
      }
      throw new UnauthorizedException('Access Denied - Invalid or expired session');
    }

    const user = await this.usersService.findOne(userId);
    const payload = { sub: user.id, email: user.email, role: user.role };

    const new_access_token = this.generateAccessToken(payload);
    const new_refresh_token = this.generateRefreshToken(payload);

    currentSession.refresh_token = crypto.createHash('sha256').update(new_refresh_token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.sessionDays);
    currentSession.expires_at = expiresAt;
    
    await this.sessionRepository.save(currentSession);
    await this.cacheSession(currentSession, currentSession.refresh_token);
    this.setRefreshTokenCookie(res, new_refresh_token, req);

    return { 
      access_token: new_access_token,
      refresh_token: new_refresh_token
    };
  }

  async logout(userId: number, rawRefreshToken: string, res: Express.Response, req?: Express.Request) {
    const hashedRawToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const sessions = await this.sessionRepository.find({ where: { userId } });
    
    for (const session of sessions) {
      if (session.refresh_token === hashedRawToken) {
        await this.sessionRepository.remove(session);
        await this.removeSessionFromCache(userId, hashedRawToken);
        break;
      }
    }

    this.clearRefreshTokenCookie(res, req);
    return { message: 'Logged out successfully from this device' };
  }

  async logoutAll(userId: number, res: Express.Response, req?: Express.Request) {
    await this.sessionRepository.delete({ userId });
    await this.redisService.delByPattern(`session:${userId}:*`);
    this.clearRefreshTokenCookie(res, req);
    return { message: 'Logged out successfully from all devices' };
  }

  // ─── Forgot / Reset Password ─────────────────────────────────────────────────

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    if (!user) {
      return { message: 'If an account exists with this email, an OTP has been sent' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpirationMinutes = this.configService.get<number>('OTP_EXPIRATION_MINUTES', 10);
    const otp_expires_at = new Date();
    otp_expires_at.setMinutes(otp_expires_at.getMinutes() + otpExpirationMinutes);

    await this.usersService.update(user.id, { otp, otp_expires_at });

    // Send password reset email via queue (falls back to sync if Redis is down)
    try {
      await this.emailQueue.add('send-password-reset', {
        to: user.email,
        name: user.name,
        otp,
      });
    } catch {
      await this.mailService.sendPasswordResetEmail(user.email, user.name, otp);
    }

    return { message: 'If an account exists with this email, an OTP has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(resetPasswordDto.email);

    if (!user || user.otp !== resetPasswordDto.otp) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (user.otp_expires_at && new Date() > user.otp_expires_at) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      otp: null as any,
      otp_expires_at: null as any,
    });

    await this.sessionRepository.delete({ userId: user.id });

    return { message: 'Password reset successfully' };
  }

  private sessionKey(userId: number, hashedToken: string): string {
    return `session:${userId}:${hashedToken}`;
  }

  private async cacheSession(session: Session, hashedToken: string): Promise<void> {
    const ttl = this.sessionDays * 24 * 60 * 60;
    await this.redisService.set(this.sessionKey(session.userId, hashedToken), session, ttl);
  }

  private async getSessionFromCache(userId: number, hashedToken: string): Promise<Session | null> {
    const cached = await this.redisService.get<Session>(this.sessionKey(userId, hashedToken));
    if (cached) return cached;

    // Fallback to DB
    const sessions = await this.sessionRepository.find({ where: { userId } });
    for (const session of sessions) {
      if (session.refresh_token === hashedToken) {
        await this.cacheSession(session, hashedToken);
        return session;
      }
    }
    return null;
  }

  private async removeSessionFromCache(userId: number, hashedToken: string): Promise<void> {
    await this.redisService.del(this.sessionKey(userId, hashedToken));
  }
}
