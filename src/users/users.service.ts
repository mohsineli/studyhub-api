import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async getLeaderboard(period?: string): Promise<User[]> {
    const query = this.usersRepository.createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.points', 'user.created_at', 'user.profile_pic'])
      .orderBy('user.points', 'DESC')
      .take(30);

    if (period === 'current' || period === 'previous') {
      const targetDate = new Date();
      if (period === 'previous') {
        targetDate.setMonth(targetDate.getMonth() - 1);
      }
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // JS months are 0-11
      
      // Using EXTRACT for PostgreSQL month/year filtering
      query.andWhere('EXTRACT(MONTH FROM user.created_at) = :month', { month })
           .andWhere('EXTRACT(YEAR FROM user.created_at) = :year', { year });
    }

    return await query.getMany();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
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
    return await this.usersRepository.save(user);
  }

  async updateProfile(id: number, updateProfileDto: any): Promise<User> {
    const user = await this.findOne(id);
    let changed = false;

    // Check if new password is being set
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

    // Update other properties if provided and different
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

    if (!changed) {
      throw new BadRequestException('No changes detected.');
    }

    return await this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
