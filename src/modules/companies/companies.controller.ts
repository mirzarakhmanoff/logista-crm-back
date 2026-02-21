import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { InviteUserDto } from '../users/dto/invite-user.dto';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
  ) {}

  private ensureSuperAdmin(user: any) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Faqat Super Admin uchun');
    }
  }

  // ─────────────────────────────────────────────
  // Company CRUD
  // ─────────────────────────────────────────────

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto, @CurrentUser() user: any) {
    this.ensureSuperAdmin(user);
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    this.ensureSuperAdmin(user);
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    this.ensureSuperAdmin(user);
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    this.ensureSuperAdmin(user);
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Patch(':id/toggle')
  toggleActive(@Param('id') id: string, @CurrentUser() user: any) {
    this.ensureSuperAdmin(user);
    return this.companiesService.toggleActive(id);
  }

  // ─────────────────────────────────────────────
  // Company Users — SUPER_ADMIN boshqaruvi
  // ─────────────────────────────────────────────

  /**
   * Kompaniyaning barcha userlarini ko'rish
   * GET /api/companies/:id/users
   */
  @Get(':id/users')
  async getUsers(@Param('id') id: string, @CurrentUser() user: any) {
    this.ensureSuperAdmin(user);
    // Kompaniya mavjudligini tekshirish
    await this.companiesService.findOne(id);
    return this.usersService.findAll(id);
  }

  /**
   * Kompaniyaga yangi user taklif qilish (SUPER_ADMIN tomonidan)
   * POST /api/companies/:id/invite
   *
   * Body: { email, fullName, role, phone?, password? }
   *
   * Rol ierarxiyasi:
   *   SUPER_ADMIN → admin, director, manager, accountant, administrator
   */
  @Post(':id/invite')
  async inviteUser(
    @Param('id') companyId: string,
    @Body() inviteUserDto: InviteUserDto,
    @CurrentUser() user: any,
  ) {
    this.ensureSuperAdmin(user);
    // Kompaniya mavjudligini tekshirish
    await this.companiesService.findOne(companyId);
    // targetCompanyId ni DTO ga biriktirish
    inviteUserDto.targetCompanyId = companyId;
    return this.usersService.inviteUser(inviteUserDto, user.userId || user.sub, companyId);
  }

  /**
   * Kompaniyadan userni chiqarish / o'chirish
   * DELETE /api/companies/:id/users/:userId
   */
  @Patch(':id/users/:userId/toggle')
  async toggleUserActive(
    @Param('id') companyId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    this.ensureSuperAdmin(user);
    await this.companiesService.findOne(companyId);
    return this.usersService.toggleActive(userId, companyId);
  }
}
