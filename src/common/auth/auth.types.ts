import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  refreshToken?: string;
}
