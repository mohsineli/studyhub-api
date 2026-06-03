import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../auth/entities/session.entity';
import { ISessionRepository } from './session-repository.interface';

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectRepository(Session) private readonly repo: Repository<Session>,
  ) {}

  create(data: Partial<Session>): Session {
    return this.repo.create(data);
  }

  async save(session: Session): Promise<Session> {
    return this.repo.save(session);
  }

  async findOne(options: { where: any }): Promise<Session | null> {
    return this.repo.findOne(options as any);
  }

  async find(options: { where: any }): Promise<Session[]> {
    return this.repo.find(options as any);
  }

  async remove(session: Session): Promise<Session> {
    return this.repo.remove(session);
  }

  async delete(where: any): Promise<any> {
    return this.repo.delete(where);
  }

  createQueryBuilder(alias: string) {
    return this.repo.createQueryBuilder(alias);
  }
}
