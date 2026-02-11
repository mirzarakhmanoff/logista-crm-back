import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from './schemas/user.schema';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('users.create')
  @ApiOperation({ summary: 'Create a new user directly (Admin/Director only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Post('invite')
  @Permissions('users.create')
  @ApiOperation({
    summary: 'Invite a new user (Admin creates Director, Director creates others)',
  })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 403, description: 'Not allowed to create this role' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async invite(
    @Body() inviteUserDto: InviteUserDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.inviteUser(inviteUserDto, user.userId || user.sub);
  }

  @Post(':id/resend-invitation')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Resend invitation email' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  async resendInvitation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.resendInvitation(id, user.userId || user.sub);
  }

  @Get('basic')
  @ApiOperation({ summary: 'Get all users basic info (for chat, selection etc.)' })
  @ApiResponse({ status: 200, description: 'List of users with basic info' })
  async findAllBasic() {
    return this.usersService.findAllBasic();
  }

  @Get()
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get all users (Admin/Director only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('stats/invitations')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get invitation statistics' })
  async getInvitationStats() {
    return this.usersService.getInvitationStats();
  }

  @Get('role/:role')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get users by role' })
  async findByRole(@Param('role') role: UserRole) {
    return this.usersService.findByRole(role);
  }

  @Get(':id')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get user by ID (Admin/Director only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Patch(':id')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update user by ID (Admin/Director only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Permissions('users.delete')
  @ApiOperation({ summary: 'Delete user by ID (Admin/Director only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
