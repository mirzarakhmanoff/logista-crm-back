import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { IJwtPayload } from '../users/interfaces/user.interface';
import { InvitationStatus, UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService');

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingEmail = await this.usersService.findByEmail(registerDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      invitationStatus: InvitationStatus.ACCEPTED,
    });

    const payload: IJwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        companyId: user.companyId?.toString(),
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    await this.usersService.updateLastLogin(user._id.toString());

    const payload: IJwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        companyId: user.companyId?.toString(),
      },
    };
  }

  async loginWithInvitationCode(
    email: string,
    password: string,
    invitationCode: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    if (user.invitationStatus !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        'Bu taklif allaqachon ishlatilgan yoki muddati o\'tgan. Oddiy login orqali kiring.',
      );
    }

    if (user.invitationCode !== invitationCode.toUpperCase()) {
      throw new UnauthorizedException('Noto\'g\'ri aktivatsiya kodi');
    }

    if (user.invitationCodeExpires && user.invitationCodeExpires < new Date()) {
      user.invitationStatus = InvitationStatus.EXPIRED;
      await user.save();
      throw new BadRequestException('Aktivatsiya kodi muddati tugagan');
    }

    // Aktivatsiyada yangi parol o'rnatish (emaildagi vaqtinchalik parol o'rniga)
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Activate the invitation
    user.invitationStatus = InvitationStatus.ACCEPTED;
    user.invitationCode = undefined;
    user.invitationCodeExpires = undefined;
    user.acceptedAt = new Date();
    user.lastLogin = new Date();
    await user.save();

    const payload: IJwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        companyId: user.companyId?.toString(),
      },
    };
  }

  async activateByCode(code: string): Promise<{ message: string; email: string }> {
    const user = await this.usersService.activateInvitation(code);
    return {
      message: 'Account activated successfully. You can now login.',
      email: user.email,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(userId, currentPassword, newPassword);
    return { message: 'Password changed successfully' };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    // Check if user needs to use invitation code
    if (user.invitationStatus === InvitationStatus.PENDING) {
      throw new UnauthorizedException(
        'Please use your invitation code to login for the first time',
      );
    }

    if (user.invitationStatus === InvitationStatus.EXPIRED) {
      throw new UnauthorizedException(
        'Your invitation has expired. Please contact administrator.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
