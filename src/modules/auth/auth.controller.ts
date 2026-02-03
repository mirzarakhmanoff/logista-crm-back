import {
  Body,
  Controller,
  Get,
  Post,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import {
  ActivateInvitationDto,
  ActivateByCodeDto,
  ChangePasswordDto,
} from './dto/activate-invitation.dto';
import { Public } from '../../common/decorators/public.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user (only for initial admin setup)' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('activate')
  @ApiOperation({ summary: 'Activate invitation with email, password and code' })
  @ApiResponse({
    status: 200,
    description: 'Invitation activated and logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async activateInvitation(
    @Body() dto: ActivateInvitationDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithInvitationCode(
      dto.email,
      dto.password,
      dto.invitationCode,
    );
  }

  @Public()
  @Post('activate/code')
  @ApiOperation({ summary: 'Activate invitation by code only (returns email)' })
  @ApiResponse({
    status: 200,
    description: 'Invitation activated, returns email for login',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async activateByCode(@Body() dto: ActivateByCodeDto) {
    return this.authService.activateByCode(dto.code);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @Request() req,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify token and return current user' })
  @ApiResponse({ status: 200, description: 'Returns current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verify(@Request() req) {
    const user = await this.usersService.findById(req.user.sub);
    const { password, _id, ...result } = user.toObject();
    return {
      id: _id.toString(),
      ...result,
    };
  }
}
