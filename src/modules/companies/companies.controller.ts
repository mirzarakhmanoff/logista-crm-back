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

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  private ensureSuperAdmin(user: any) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Faqat Super Admin uchun');
    }
  }

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
}
