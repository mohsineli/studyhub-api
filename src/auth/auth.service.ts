import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
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
import { PendingUser } from './entities/pending-user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { TokenService } from './token.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private activityService: ActivityService,
    private configService: ConfigService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    @InjectRepository(PendingUser)
    private pendingUserRepository: Repository<PendingUser>,
    @InjectQueue('email') private emailQueue: Queue,
    private mailService: MailService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const { password, role, ...userData } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10));

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + this.configService.get<number>('OTP_EXPIRATION_MINUTES', 10));

    let pendingUser = await this.pendingUserRepository.findOne({ where: { email: createUserDto.email } });

    const userToSave = {
      ...userData,
      password: hashedPassword,
      role: UserRole.STUDENT,
      otp,
      otp_expires_at: otpExpiresAt,
    };

    if (pendingUser) {
      Object.assign(pendingUser, userToSave);
    } else {
      pendingUser = this.pendingUserRepository.create(userToSave);
    }

    await this.pendingUserRepository.save(pendingUser);

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
    const pendingUser = await this.pendingUserRepository.findOne({ where: { email: verifyEmailDto.email } });

    if (!pendingUser || pendingUser.otp !== verifyEmailDto.otp) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (pendingUser.otp_expires_at < new Date()) {
      throw new BadRequestException('OTP has expired. Please register again.');
    }

    const user = await this.usersService.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      role: pendingUser.role,
    });

    await this.usersService.update(user.id, { verified: true });

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

    if (!user.verified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.tokenService.generateAccessToken(payload);
    const refresh_token = this.tokenService.generateRefreshToken(payload);

    await this.sessionService.create(user.id, refresh_token, req.get('user-agent'), req.ip);

    await this.activityService.updateLastActive(user.id);

    this.tokenService.setRefreshTokenCookie(res, refresh_token, req);

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
    const currentSession = await this.sessionService.findByToken(userId, rawRefreshToken);

    if (!currentSession || currentSession.expires_at < new Date()) {
      if (currentSession) {
        await this.sessionService.remove(currentSession, userId, rawRefreshToken);
      }
      throw new UnauthorizedException('Access Denied - Invalid or expired session');
    }

    const user = await this.usersService.findOne(userId);
    const payload = { sub: user.id, email: user.email, role: user.role };

    const new_access_token = this.tokenService.generateAccessToken(payload);
    const new_refresh_token = this.tokenService.generateRefreshToken(payload);

    await this.sessionService.updateToken(currentSession, new_refresh_token);
    this.tokenService.setRefreshTokenCookie(res, new_refresh_token, req);

    return {
      access_token: new_access_token,
      refresh_token: new_refresh_token,
    };
  }

  async logout(userId: number, rawRefreshToken: string, res: Express.Response, req?: Express.Request) {
    const session = await this.sessionService.findByToken(userId, rawRefreshToken);
    if (session) {
      await this.sessionService.remove(session, userId, rawRefreshToken);
    }
    this.tokenService.clearRefreshTokenCookie(res, req);
    return { message: 'Logged out successfully from this device' };
  }

  async logoutAll(userId: number, res: Express.Response, req?: Express.Request) {
    await this.sessionService.removeAllByUser(userId);
    this.tokenService.clearRefreshTokenCookie(res, req);
    return { message: 'Logged out successfully from all devices' };
  }

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

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10));

    await this.usersService.update(user.id, {
      password: hashedPassword,
      otp: null as any,
      otp_expires_at: null as any,
    });

    await this.sessionService.removeAllByUser(user.id);

    return { message: 'Password reset successfully' };
  }
}
