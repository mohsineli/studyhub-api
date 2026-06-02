import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard';
import { RolesGuard } from './roles.guard';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { Session } from './entities/session.entity';
import { PendingUser } from './entities/pending-user.entity';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    TypeOrmModule.forFeature([Session, PendingUser]),
    JwtModule, // No default config — each sign() call gets its own secret/expiry
    QueueModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, TokenService, SessionService, JwtAuthGuard, JwtRefreshAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, JwtRefreshAuthGuard, RolesGuard],
})
export class AuthModule {}
