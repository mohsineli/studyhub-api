import { Session } from '../../auth/entities/session.entity';

export interface ISessionRepository {
  create(data: Partial<Session>): Session;
  save(session: Session): Promise<Session>;
  findOne(options: { where: any }): Promise<Session | null>;
  find(options: { where: any }): Promise<Session[]>;
  remove(session: Session): Promise<Session>;
  delete(where: any): Promise<any>;
  createQueryBuilder(alias: string): any;
}
