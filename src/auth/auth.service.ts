import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with hashed password
    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });

    // Remove password from response
    delete user.password;
    
    return {
      message: 'User registered successfully',
      user,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.verified) {
        // You might want to handle this differently depending on requirements
        // throw new UnauthorizedException('Please verify your email first');
    }

    const payload = { 
        email: user.email, 
        sub: user.id, 
        role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    
    if (!user) {
      // For security, don't reveal if user exists. Just say "if email exists, OTP sent"
      return { message: 'If an account exists with this email, an OTP has been sent' };
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to user (In a real app, add expiration time)
    await this.usersService.update(user.id, { otp });

    // TODO: Send email with OTP
    console.log(`OTP for ${user.email}: ${otp}`);

    return { message: 'If an account exists with this email, an OTP has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(resetPasswordDto.email);

    if (!user || user.otp !== resetPasswordDto.otp) {
      throw new BadRequestException('Invalid email or OTP');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    
    await this.usersService.update(user.id, { 
      password: hashedPassword,
      otp: null // Clear OTP after success
    });

    return { message: 'Password reset successfully' };
  }
}
