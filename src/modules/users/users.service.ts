import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole, InvitationStatus } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { NotificationEmailService } from './services/notification-email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationEmailService: NotificationEmailService,
  ) {}

  private generateInvitationCode(): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private canCreateRole(creatorRole: UserRole, targetRole: UserRole): boolean {
    if (creatorRole === UserRole.SUPER_ADMIN) {
      return true;
    }
    if (creatorRole === UserRole.ADMIN) {
      return targetRole !== UserRole.SUPER_ADMIN;
    }
    if (creatorRole === UserRole.DIRECTOR) {
      return [UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.ADMINISTRATOR].includes(targetRole);
    }
    return false;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll(companyId?: string): Promise<User[]> {
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    return this.userModel.find(filter).select('-password').exec();
  }

  async findAllBasic(companyId?: string): Promise<Pick<User, '_id' | 'fullName' | 'role' | 'avatar'>[]> {
    const filter: any = { isActive: true };
    if (companyId) filter.companyId = companyId;
    return this.userModel
      .find(filter)
      .select('fullName role avatar')
      .exec();
  }

  async findByRole(role: UserRole, companyId?: string): Promise<User[]> {
    const filter: any = { role };
    if (companyId) filter.companyId = companyId;
    return this.userModel.find(filter).select('-password').exec();
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = new this.userModel({
      ...userData,
      email: userData.email?.toLowerCase(),
    });
    return user.save();
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const existingEmail = await this.findByEmail(createUserDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = new this.userModel({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
      invitationStatus: InvitationStatus.ACCEPTED,
    });

    return user.save();
  }

  async inviteUser(inviteDto: InviteUserDto, invitedById: string, companyId?: string): Promise<User> {
    const inviter = await this.findById(invitedById);

    if (!this.canCreateRole(inviter.role, inviteDto.role)) {
      throw new ForbiddenException(
        `${inviter.role} role cannot create ${inviteDto.role} users`,
      );
    }

    const existingEmail = await this.findByEmail(inviteDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const plainPassword = inviteDto.password || this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const invitationCode = this.generateInvitationCode();
    const invitationCodeExpires = new Date();
    invitationCodeExpires.setHours(invitationCodeExpires.getHours() + 24);

    // SUPER_ADMIN dto ichida targetCompanyId berib yuborishi mumkin
    const resolvedCompanyId = inviteDto.targetCompanyId || companyId || inviter.companyId?.toString();

    const user = new this.userModel({
      email: inviteDto.email.toLowerCase(),
      password: hashedPassword,
      fullName: inviteDto.fullName,
      role: inviteDto.role,
      phone: inviteDto.phone,
      isActive: true,
      invitationStatus: InvitationStatus.PENDING,
      invitationCode,
      invitationCodeExpires,
      mustChangePassword: true,
      invitedBy: new Types.ObjectId(invitedById),
      invitedAt: new Date(),
      companyId: resolvedCompanyId ? new Types.ObjectId(resolvedCompanyId) : undefined,
    });

    const savedUser = await user.save();

    try {
      await this.notificationEmailService.sendInvitationEmail({
        to: inviteDto.email,
        fullName: inviteDto.fullName,
        role: inviteDto.role,
        password: plainPassword,
        invitationCode,
        invitedByName: inviter.fullName,
      });
    } catch (error) {
      await this.userModel.findByIdAndDelete(savedUser._id);
      throw new BadRequestException(
        `Foydalanuvchi yaratildi, lekin email yuborishda xato: ${error.message}`,
      );
    }

    const { password: _, ...result } = savedUser.toObject();
    return result as any;
  }

  async activateInvitation(code: string): Promise<User> {
    const user = await this.userModel
      .findOne({
        invitationCode: code.toUpperCase(),
        invitationStatus: InvitationStatus.PENDING,
      })
      .exec();

    if (!user) {
      throw new BadRequestException('Invalid or expired invitation code');
    }

    if (user.invitationCodeExpires && user.invitationCodeExpires < new Date()) {
      user.invitationStatus = InvitationStatus.EXPIRED;
      await user.save();
      throw new BadRequestException('Invitation code has expired');
    }

    user.invitationStatus = InvitationStatus.ACCEPTED;
    user.invitationCode = undefined;
    user.invitationCodeExpires = undefined;
    user.acceptedAt = new Date();
    await user.save();

    return user;
  }

  async resendInvitation(userId: string, resendById: string): Promise<User> {
    const user = await this.findById(userId);
    const resender = await this.findById(resendById);

    if (user.invitationStatus !== InvitationStatus.PENDING &&
        user.invitationStatus !== InvitationStatus.EXPIRED) {
      throw new BadRequestException('User has already accepted the invitation');
    }

    const plainPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const invitationCode = this.generateInvitationCode();
    const invitationCodeExpires = new Date();
    invitationCodeExpires.setHours(invitationCodeExpires.getHours() + 24);

    user.password = hashedPassword;
    user.invitationCode = invitationCode;
    user.invitationCodeExpires = invitationCodeExpires;
    user.invitationStatus = InvitationStatus.PENDING;
    user.invitedAt = new Date();

    await user.save();

    try {
      await this.notificationEmailService.sendInvitationEmail({
        to: user.email,
        fullName: user.fullName,
        role: user.role,
        password: plainPassword,
        invitationCode,
        invitedByName: resender.fullName,
      });
    } catch (error) {
      throw new BadRequestException(
        `Taklif yangilandi, lekin email yuborishda xato: ${error.message}`,
      );
    }

    const { password: _, ...result } = user.toObject();
    return result as any;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateUserDto.email && updateUserDto.email.toLowerCase() !== user.email) {
      const existingEmail = await this.findByEmail(updateUserDto.email);
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
      updateUserDto.email = updateUserDto.email.toLowerCase();
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(userId);

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();
  }

  async toggleActive(userId: string, companyId: string): Promise<User> {
    const user = await this.userModel
      .findOne({ _id: userId, companyId: companyId })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User topilmadi yoki bu kompaniyaga tegishli emas');
    }

    user.isActive = !user.isActive;
    return user.save();
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);

    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userModel.countDocuments({ role: UserRole.ADMIN });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin user');
      }
    }

    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { lastLogin: new Date() })
      .exec();
  }

  async getInvitationStats(companyId?: string): Promise<any> {
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    const [pending, accepted, expired, total] = await Promise.all([
      this.userModel.countDocuments({ ...filter, invitationStatus: InvitationStatus.PENDING }),
      this.userModel.countDocuments({ ...filter, invitationStatus: InvitationStatus.ACCEPTED }),
      this.userModel.countDocuments({ ...filter, invitationStatus: InvitationStatus.EXPIRED }),
      this.userModel.countDocuments(filter),
    ]);

    return { pending, accepted, expired, total };
  }
}
