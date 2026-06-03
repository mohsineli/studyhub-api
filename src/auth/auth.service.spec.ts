import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { UsersService } from '../users/users.service';
import { ActivityService } from '../users/activity.service';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { UserRole } from '../users/entities/user.entity';
import { PendingUserRepository } from '../common/repositories/pending-user.repository';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: jest.Mocked<TokenService>;
  let sessionService: jest.Mocked<SessionService>;
  let usersService: jest.Mocked<UsersService>;
  let activityService: jest.Mocked<ActivityService>;
  let pendingUserRepository: jest.Mocked<any>;
  let emailQueue: jest.Mocked<any>;
  let mailService: jest.Mocked<MailService>;
  let redisService: jest.Mocked<RedisService>;
  const bcrypt = require('bcrypt');

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed_password',
    role: UserRole.STUDENT,
    verified: true,
    dept: null,
    code: null,
    profile_pic: null,
    points: 0,
    preferred_theme: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ActivityService,
          useValue: {
            updateLastActive: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            generateAccessToken: jest.fn().mockReturnValue('mock_access_token'),
            generateRefreshToken: jest.fn().mockReturnValue('mock_refresh_token'),
            setRefreshTokenCookie: jest.fn(),
            clearRefreshTokenCookie: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
            findByToken: jest.fn(),
            updateToken: jest.fn().mockResolvedValue({}),
            remove: jest.fn().mockResolvedValue(undefined),
            removeAllByUser: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_ACCESS_SECRET: 'access_secret',
                JWT_REFRESH_SECRET: 'refresh_secret',
                JWT_ACCESS_EXPIRATION: '15m',
                JWT_REFRESH_EXPIRATION: '7d',
                FRONTEND_URL: 'http://localhost:3000',
                BCRYPT_SALT_ROUNDS: '10',
                OTP_EXPIRATION_MINUTES: '10',
                SESSION_DURATION_DAYS: '7',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PendingUserRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getQueueToken('email'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            delByPattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tokenService = module.get(TokenService) as jest.Mocked<TokenService>;
    sessionService = module.get(SessionService) as jest.Mocked<SessionService>;
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    activityService = module.get(ActivityService) as jest.Mocked<ActivityService>;
    pendingUserRepository = module.get(PendingUserRepository) as jest.Mocked<any>;
    emailQueue = module.get(getQueueToken('email')) as jest.Mocked<any>;
    mailService = module.get(MailService) as jest.Mocked<MailService>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
    };

    it('should register a new user and queue verification email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      pendingUserRepository.findOne.mockResolvedValue(null);
      pendingUserRepository.create.mockReturnValue({});
      pendingUserRepository.save.mockResolvedValue({});
      emailQueue.add.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(pendingUserRepository.create).toHaveBeenCalled();
      expect(pendingUserRepository.save).toHaveBeenCalled();
      expect(emailQueue.add).toHaveBeenCalledWith('send-verification', expect.any(Object));
      expect(result.message).toContain('Registration initiated');
    });

    it('should throw ConflictException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should fall back to sync email if queue fails', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      pendingUserRepository.findOne.mockResolvedValue(null);
      pendingUserRepository.create.mockReturnValue({});
      pendingUserRepository.save.mockResolvedValue({});
      emailQueue.add.mockRejectedValue(new Error('Redis down'));

      await service.register(registerDto);

      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should force role to STUDENT regardless of input', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      pendingUserRepository.findOne.mockResolvedValue(null);
      pendingUserRepository.create.mockImplementation((data: any) => data);
      pendingUserRepository.save.mockImplementation((data: any) => data);

      await service.register({ ...registerDto, role: UserRole.ADMIN });

      const savedUser = pendingUserRepository.save.mock.calls[0][0];
      expect(savedUser.role).toBe(UserRole.STUDENT);
    });
  });

  describe('verifyEmail', () => {
    const verifyDto = { email: 'new@example.com', otp: '123456' };
    const mockPendingUser = {
      email: 'new@example.com',
      name: 'New User',
      password: 'hashed_pw',
      role: UserRole.STUDENT,
      otp: '123456',
      otp_expires_at: new Date(Date.now() + 600000),
    };

    it('should verify email and create permanent user', async () => {
      pendingUserRepository.findOne.mockResolvedValue(mockPendingUser);
      usersService.create.mockResolvedValue(mockUser as any);
      usersService.update.mockResolvedValue(mockUser as any);
      pendingUserRepository.remove.mockResolvedValue(undefined);

      const result = await service.verifyEmail(verifyDto);

      expect(usersService.create).toHaveBeenCalledWith({
        name: mockPendingUser.name,
        email: mockPendingUser.email,
        password: mockPendingUser.password,
        role: mockPendingUser.role,
      });
      expect(pendingUserRepository.remove).toHaveBeenCalledWith(mockPendingUser);
      expect(result.message).toContain('verified');
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      pendingUserRepository.findOne.mockResolvedValue(mockPendingUser);

      await expect(service.verifyEmail({ ...verifyDto, otp: 'wrong' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP expired', async () => {
      pendingUserRepository.findOne.mockResolvedValue({
        ...mockPendingUser,
        otp_expires_at: new Date(Date.now() - 600000),
      });

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };
    const mockReq = { get: jest.fn(), ip: '127.0.0.1' } as any;
    const mockRes = { cookie: jest.fn() } as any;

    it('should login successfully and return tokens', async () => {
      bcrypt.compare.mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      activityService.updateLastActive.mockResolvedValue(undefined as any);

      const result = await service.login(loginDto, mockReq, mockRes);

      expect(result.access_token).toBe('mock_access_token');
      expect(result.refresh_token).toBe('mock_refresh_token');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(sessionService.create).toHaveBeenCalled();
      expect(tokenService.setRefreshTokenCookie).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto, mockReq, mockRes)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.login(loginDto, mockReq, mockRes)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, verified: false } as any);

      await expect(service.login(loginDto, mockReq, mockRes)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    const mockReq = { get: jest.fn() } as any;
    const mockRes = { cookie: jest.fn() } as any;
    const rawToken = 'refresh_token_string';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const mockSession = {
      userId: 1,
      refresh_token: hashedToken,
      expires_at: new Date(Date.now() + 86400000),
    };

    it('should refresh tokens successfully', async () => {
      sessionService.findByToken.mockResolvedValue(mockSession as any);
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await service.refreshTokens(1, rawToken, mockReq, mockRes);

      expect(result.access_token).toBe('mock_access_token');
      expect(result.refresh_token).toBe('mock_refresh_token');
      expect(tokenService.generateAccessToken).toHaveBeenCalled();
      expect(tokenService.generateRefreshToken).toHaveBeenCalled();
      expect(sessionService.updateToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for expired session', async () => {
      sessionService.findByToken.mockResolvedValue({
        ...mockSession,
        expires_at: new Date(Date.now() - 86400000),
      } as any);

      await expect(service.refreshTokens(1, rawToken, mockReq, mockRes)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const rawToken = 'refresh_token_string';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const mockRes = { clearCookie: jest.fn() } as any;

    it('should logout and remove session', async () => {
      sessionService.findByToken.mockResolvedValue({ refresh_token: hashedToken } as any);

      const result = await service.logout(1, rawToken, mockRes);

      expect(sessionService.remove).toHaveBeenCalled();
      expect(result.message).toContain('Logged out');
    });

    it('should handle logout when no matching session found', async () => {
      sessionService.findByToken.mockResolvedValue(null);

      const result = await service.logout(1, rawToken, mockRes);

      expect(sessionService.remove).not.toHaveBeenCalled();
      expect(result.message).toContain('Logged out');
    });
  });

  describe('forgotPassword', () => {
    it('should send reset OTP for existing user', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.update.mockResolvedValue(mockUser as any);
      emailQueue.add.mockResolvedValue(undefined);

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(usersService.update).toHaveBeenCalledWith(1, expect.objectContaining({ otp: expect.any(String) }));
      expect(result.message).toContain('OTP has been sent');
    });

    it('should return generic message even if email not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });

      expect(result.message).toContain('If an account exists');
    });
  });

  describe('resetPassword', () => {
    const resetDto = { email: 'test@example.com', otp: '123456', newPassword: 'newpass123' };

    it('should reset password and delete all sessions', async () => {
      const userWithOtp = { ...mockUser, otp: '123456', otp_expires_at: new Date(Date.now() + 600000) };
      usersService.findByEmail.mockResolvedValue(userWithOtp as any);
      usersService.update.mockResolvedValue(userWithOtp as any);

      const result = await service.resetPassword(resetDto);

      expect(usersService.update).toHaveBeenCalled();
      expect(sessionService.removeAllByUser).toHaveBeenCalledWith(1);
      expect(result.message).toContain('Password reset successfully');
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, otp: 'wrong_otp', otp_expires_at: new Date() } as any);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP expired', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        otp: '123456',
        otp_expires_at: new Date(Date.now() - 600000),
      } as any);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });
  });
});
