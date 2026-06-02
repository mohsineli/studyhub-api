import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            verifyEmail: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = { name: 'Test', email: 'test@test.com', password: 'pass123' };
      authService.register.mockResolvedValue({ message: 'ok', email: dto.email } as any);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result.message).toBe('ok');
    });
  });

  describe('login', () => {
    it('should call authService.login with request/response', async () => {
      const dto = { email: 'test@test.com', password: 'pass123' };
      const mockReq = { get: jest.fn(), ip: '127.0.0.1' } as any;
      const mockResponse = { access_token: 'token' } as any;
      authService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(dto, mockReq, mockRes);

      expect(authService.login).toHaveBeenCalledWith(dto, mockReq, mockRes);
      expect(result).toBe(mockResponse);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with user from guard', async () => {
      const mockReq = { user: { id: 1, refreshToken: 'token' } } as any;
      authService.refreshTokens.mockResolvedValue({ access_token: 'new_token' } as any);

      const result = await controller.refresh(mockReq, mockRes);

      expect(authService.refreshTokens).toHaveBeenCalledWith(1, 'token', mockReq, mockRes);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user from guard', async () => {
      const mockReq = { user: { id: 1, refreshToken: 'token' } } as any;
      authService.logout.mockResolvedValue({ message: 'logged out' } as any);

      const result = await controller.logout(mockReq, mockRes);

      expect(authService.logout).toHaveBeenCalledWith(1, 'token', mockRes, mockReq);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword', async () => {
      const dto = { email: 'test@test.com' };
      authService.forgotPassword.mockResolvedValue({ message: 'sent' } as any);

      const result = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
    });
  });
});
