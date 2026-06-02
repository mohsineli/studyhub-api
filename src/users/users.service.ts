import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { NoteStatus } from '../notes/entities/note.entity';
import { SettingsService } from '../admin/settings.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly settingsService: SettingsService,
    private readonly redisService: RedisService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async findAll(options?: { search?: string; limit?: number; offset?: number }, userRole?: string): Promise<{ users: User[]; total: number }> {
    if (userRole && userRole !== UserRole.ADMIN) {
      await this.settingsService.enforcePermission(userRole, 'perm_view_users');
    }
    const query = this.usersRepository.createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.banned', 'user.points', 'user.created_at', 'user.profile_pic', 'user.dept'])
      .orderBy('user.created_at', 'DESC');

    if (options?.search) {
      query.where('user.name ILIKE :search OR user.email ILIKE :search OR user.dept ILIKE :search', { search: `%${options.search}%` });
    }

    if (options?.limit) {
      query.take(options.limit);
    }
    if (options?.offset) {
      query.skip(options.offset);
    }

    const [users, total] = await query.getManyAndCount();
    return { users, total };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async getPublicProfile(id: number): Promise<any> {
    return this.redisService.wrap(`user:profile:${id}`, 120, async () => {
      return this.fetchPublicProfile(id);
    });
  }

  private async fetchPublicProfile(id: number): Promise<any> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id', 'user.name', 'user.profile_pic', 'user.dept', 'user.code',
        'user.points', 'user.created_at', 'user.role',
        'user.github', 'user.linkedin', 'user.instagram', 'user.facebook',
      ])
      .loadRelationCountAndMap('user.noteCount', 'user.notes', 'note', qb =>
        qb.andWhere('note.status = :status', { status: NoteStatus.APPROVED })
      )
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const rank = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.points > :points', { points: user.points })
      .getCount();

    return {
      id: user.id,
      name: user.name,
      profile_pic: user.profile_pic,
      dept: user.dept,
      code: user.code,
      role: user.role,
      points: user.points,
      created_at: user.created_at,
      noteCount: (user as any).noteCount || 0,
      rank: rank + 1,
      github: user.github || null,
      linkedin: user.linkedin || null,
      instagram: user.instagram || null,
      facebook: user.facebook || null,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async update(id: number, updateUserDto: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    if (updateUserDto.password && !updateUserDto.password.startsWith('$2')) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    Object.assign(user, updateUserDto);
    const savedUser = await this.usersRepository.save(user);
    await this.redisService.delByPattern('leaderboard:*');
    await this.redisService.delByPattern('activeUsers:*');
    await this.redisService.delByPattern(`user:profile:${id}`);
    return savedUser;
  }

  async updateProfile(id: number, updateProfileDto: any): Promise<User> {
    const user = await this.findOne(id);
    let changed = false;

    if (updateProfileDto.password) {
      if (!updateProfileDto.currentPassword) {
        throw new BadRequestException('Current password is required to change password.');
      }

      const isMatch = await bcrypt.compare(updateProfileDto.currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Current password is incorrect.');
      }

      const isSamePassword = await bcrypt.compare(updateProfileDto.password, user.password);
      if (isSamePassword) {
        throw new BadRequestException('New password cannot be the same as your current password.');
      }

      user.password = await bcrypt.hash(updateProfileDto.password, 10);
      changed = true;
    }

    if (updateProfileDto.name && updateProfileDto.name !== user.name) {
      user.name = updateProfileDto.name;
      changed = true;
    }
    if (updateProfileDto.dept !== undefined && updateProfileDto.dept !== user.dept) {
      user.dept = updateProfileDto.dept;
      changed = true;
    }
    if (updateProfileDto.code !== undefined && updateProfileDto.code !== user.code) {
      user.code = updateProfileDto.code;
      changed = true;
    }
    if (updateProfileDto.profile_pic !== undefined && updateProfileDto.profile_pic !== user.profile_pic) {
      user.profile_pic = updateProfileDto.profile_pic;
      changed = true;
    }
    if (updateProfileDto.preferred_theme !== undefined && updateProfileDto.preferred_theme !== user.preferred_theme) {
      user.preferred_theme = updateProfileDto.preferred_theme;
      changed = true;
    }

    ['github', 'linkedin', 'instagram', 'facebook'].forEach(field => {
      if (updateProfileDto[field] !== undefined && updateProfileDto[field] !== user[field]) {
        user[field] = updateProfileDto[field];
        changed = true;
      }
    });

    if (!changed) {
      throw new BadRequestException('No changes detected.');
    }

    const updatedUser = await this.usersRepository.save(user);
    await this.redisService.delByPattern(`user:profile:${id}`);
    return updatedUser;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async banUser(targetId: number, adminId: number): Promise<{ message: string }> {
    if (targetId === adminId) {
      throw new ForbiddenException('You cannot ban yourself.');
    }
    const user = await this.findOne(targetId);
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot ban an admin.');
    }
    user.banned = true;
    await this.usersRepository.save(user);
    await this.redisService.delByPattern('leaderboard:*');
    await this.redisService.delByPattern('activeUsers:*');
    return { message: `User "${user.name}" has been banned.` };
  }

  async unbanUser(targetId: number): Promise<{ message: string }> {
    const user = await this.findOne(targetId);
    user.banned = false;
    await this.usersRepository.save(user);
    await this.redisService.delByPattern('leaderboard:*');
    await this.redisService.delByPattern('activeUsers:*');
    return { message: `User "${user.name}" has been unbanned.` };
  }

  async setRole(targetId: number, role: UserRole, adminId: number): Promise<{ message: string }> {
    if (targetId === adminId) {
      throw new ForbiddenException('You cannot change your own role.');
    }
    const user = await this.findOne(targetId);
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot change the role of another admin.');
    }
    user.role = role;
    await this.usersRepository.save(user);
    await this.redisService.delByPattern('leaderboard:*');
    await this.redisService.delByPattern('activeUsers:*');
    return { message: `User "${user.name}" role updated to "${role}".` };
  }
}
