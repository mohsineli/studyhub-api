import { User } from '../../users/entities/user.entity';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findOne(options: { where: any; relations?: string[] }): Promise<User | null>;
  find(options: { where?: any; relations?: string[]; order?: any; take?: number; select?: string[] }): Promise<User[]>;
  save(user: Partial<User>): Promise<User>;
  create(data: Partial<User>): User;
  remove(user: User): Promise<User>;
  count(options?: { where?: any }): Promise<number>;
  findTopByPoints(limit: number): Promise<User[]>;
  increment(where: any, column: string, amount: number): Promise<any>;
  incrementPoints(id: number, amount: number): Promise<void>;
  update(where: any, partial: Partial<User>): Promise<any>;
  updateLastActive(id: number): Promise<void>;
  createQueryBuilder(alias: string): any;
}
