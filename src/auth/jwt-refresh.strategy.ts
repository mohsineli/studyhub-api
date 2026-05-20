import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as Express from 'express';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      // Extract refresh token from HttpOnly cookie, Authorization header, or request body
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Express.Request) => {
          // 1. Try extracting from cookie
          let token = request?.cookies?.refresh_token;
          if (token) return token;
          
          // 2. Try extracting from Authorization header
          const authHeader = request?.headers?.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
          }

          // 3. Try extracting from request body
          if (request?.body?.refresh_token) {
            return request.body.refresh_token;
          }

          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string,
      passReqToCallback: true,
    });
  }

  async validate(request: Express.Request, payload: any) {
    let refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      const authHeader = request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.substring(7);
      }
    }
    if (!refreshToken) {
      refreshToken = request.body?.refresh_token;
    }
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Access Denied');
    }

    return { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      name: user.name, 
      points: user.points, 
      refreshToken 
    };
  }
}
