import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
      .select(['user.id', 'user.name', 'user.points', 'user.created_at'])
      .orderBy('user.points', 'DESC')
      .take(10);

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
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
