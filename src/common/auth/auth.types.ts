import { Request } from 'express';
import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  refreshToken?: string;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
