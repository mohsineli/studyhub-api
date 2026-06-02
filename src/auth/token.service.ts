import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as Express from 'express';

@Injectable()
export class TokenService {
  private get sessionDays(): number {
    return this.configService.get<number>('SESSION_DURATION_DAYS', 7);
  }

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: { sub: number; email: string; role: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET')!,
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') as any,
    });
  }

  generateRefreshToken(payload: { sub: number; email: string; role: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') as any,
    });
  }

  setRefreshTokenCookie(res: Express.Response, refreshToken: string, req?: Express.Request): void {
    const maxAge = this.sessionDays * 24 * 60 * 60 * 1000;
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.isProduction(req),
      sameSite: this.isProduction(req) ? 'none' : 'lax',
      maxAge,
    });
  }

  clearRefreshTokenCookie(res: Express.Response, req?: Express.Request): void {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.isProduction(req),
      sameSite: this.isProduction(req) ? 'none' : 'lax',
    });
  }

  private isProduction(req?: Express.Request): boolean {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return false;
    }

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

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    if (frontendUrl.startsWith('http://localhost') || frontendUrl.startsWith('http://127.0.0.1')) {
      return false;
    }
    return frontendUrl.startsWith('https');
  }
}
