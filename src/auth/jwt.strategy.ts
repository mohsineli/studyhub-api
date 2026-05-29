import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') as string,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Fire and forget updating last active timestamp
    this.usersService.updateLastActive(user.id).catch(err => console.error('Failed to update last_active_at', err));
    return { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      name: user.name, 
      points: user.points,
      dept: user.dept,
      code: user.code,
      profile_pic: user.profile_pic,
      banned: user.banned,
      github: user.github,
      linkedin: user.linkedin,
      instagram: user.instagram,
      facebook: user.facebook,
    };
  }
}
