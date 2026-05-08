import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Express from 'express';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { Session } from './entities/session.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
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

  setRefreshTokenCookie(res: Express.Response, refreshToken: string): void {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  clearRefreshTokenCookie(res: Express.Response): void {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }

  // ─── Auth Methods ────────────────────────────────────────────────────────────

  async register(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });

    return {
      message: 'User registered successfully. Please verify your email.',
      user: { id: user.id, name: user.name, email: user.email },
    };
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

    if (!user.verified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.generateAccessToken(payload);
    const refresh_token = this.generateRefreshToken(payload);

    // Create a new session for this device
    const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = this.sessionRepository.create({
      refresh_token: hashedRefreshToken,
      userId: user.id,
      user_agent: req.get('user-agent'),
      ip_address: req.ip,
      expires_at: expiresAt,
    });
    await this.sessionRepository.save(session);

    this.setRefreshTokenCookie(res, refresh_token);

    return {
      access_token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refreshTokens(userId: number, rawRefreshToken: string, req: Express.Request, res: Express.Response) {
    const sessions = await this.sessionRepository.find({ where: { userId } });
    
    // Find the specific session matching this refresh token
    let currentSession: Session | null = null;
    for (const session of sessions) {
      if (await bcrypt.compare(rawRefreshToken, session.refresh_token)) {
        currentSession = session;
        break;
      }
    }

    if (!currentSession || currentSession.expires_at < new Date()) {
      if (currentSession) await this.sessionRepository.remove(currentSession);
      throw new UnauthorizedException('Access Denied - Invalid or expired session');
    }

    const user = await this.usersService.findOne(userId);
    const payload = { sub: user.id, email: user.email, role: user.role };

    const new_access_token = this.generateAccessToken(payload);
    const new_refresh_token = this.generateRefreshToken(payload);

    // Rotate the refresh token for this specific session
    currentSession.refresh_token = await bcrypt.hash(new_refresh_token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    currentSession.expires_at = expiresAt;
    
    await this.sessionRepository.save(currentSession);
    this.setRefreshTokenCookie(res, new_refresh_token);

    return { access_token: new_access_token };
  }

  async logout(userId: number, rawRefreshToken: string, res: Express.Response) {
    const sessions = await this.sessionRepository.find({ where: { userId } });
    
    for (const session of sessions) {
      if (await bcrypt.compare(rawRefreshToken, session.refresh_token)) {
        await this.sessionRepository.remove(session);
        break;
      }
    }

    this.clearRefreshTokenCookie(res);
    return { message: 'Logged out successfully from this device' };
  }

  async logoutAll(userId: number, res: Express.Response) {
    await this.sessionRepository.delete({ userId });
    this.clearRefreshTokenCookie(res);
    return { message: 'Logged out successfully from all devices' };
  }

  // ─── Forgot / Reset Password ─────────────────────────────────────────────────

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    if (!user) {
      return { message: 'If an account exists with this email, an OTP has been sent' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expires_at = new Date();
    otp_expires_at.setMinutes(otp_expires_at.getMinutes() + 10);

    await this.usersService.update(user.id, { otp, otp_expires_at });

    // TODO: Replace with email service (e.g. Nodemailer / SendGrid)
    console.log(`OTP for ${user.email}: ${otp}`);

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

    // Option: Logout of all devices on password reset for security
    await this.sessionRepository.delete({ userId: user.id });

    return { message: 'Password reset successfully' };
  }
}
