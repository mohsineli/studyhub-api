import { User } from '../../users/entities/user.entity';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: Partial<User>): Promise<User>;
  create(data: Partial<User>): User;
  remove(user: User): Promise<User>;
  count(): Promise<number>;
  findTopByPoints(limit: number): Promise<User[]>;
  incrementPoints(id: number, amount: number): Promise<void>;
  updateLastActive(id: number): Promise<void>;
  createQueryBuilder(alias: string): any;
}
