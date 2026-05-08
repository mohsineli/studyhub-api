import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import * as Express from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // POST /auth/login
  // Returns: { access_token, user } + sets refresh_token in HttpOnly cookie
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Express.Response) {
    return this.authService.login(loginDto, res);
  }

  // POST /auth/refresh
  // Uses refresh token from cookie to issue a new access_token + new refresh_token (rotation)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshAuthGuard)
  async refresh(@Req() req: Express.Request, @Res({ passthrough: true }) res: Express.Response) {
    const user = req.user as any;
    return this.authService.refreshTokens(user.id, user.refreshToken, res);
  }

  // POST /auth/logout
  // Clears cookie and removes refresh token from DB
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Express.Request, @Res({ passthrough: true }) res: Express.Response) {
    const user = req.user as any;
    return this.authService.logout(user.id, res);
  }

  // GET /auth/me — example of a protected route
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Express.Request) {
    return req.user;
  }

  // POST /auth/forgot-password
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  // POST /auth/reset-password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
