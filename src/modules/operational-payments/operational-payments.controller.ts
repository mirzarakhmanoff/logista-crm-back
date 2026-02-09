import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { OperationalPaymentsService } from './operational-payments.service';
import { CreateOperationalPaymentDto } from './dto/create-operational-payment.dto';
import { UpdateOperationalPaymentDto } from './dto/update-operational-payment.dto';
import { FilterOperationalPaymentDto } from './dto/filter-operational-payment.dto';
import { ApprovePaymentDto } from './dto/approve-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Operational Payments')
@ApiBearerAuth()
@Controller('operational-payments')
export class OperationalPaymentsController {
  constructor(
    private readonly operationalPaymentsService: OperationalPaymentsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DIRECTOR, UserRole.MANAGER)
  async create(
    @Body() createDto: CreateOperationalPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.operationalPaymentsService.create(createDto, user.userId);
  }

  @Get()
  async findAll(@Query() filterDto: FilterOperationalPaymentDto) {
    return this.operationalPaymentsService.findAll(filterDto);
  }

  @Get('statistics')
  async getStatistics() {
    return this.operationalPaymentsService.getStatistics();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.operationalPaymentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DIRECTOR, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOperationalPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.operationalPaymentsService.update(id, updateDto, user.userId);
  }

  @Post(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DIRECTOR, UserRole.MANAGER)
  async submitForApproval(@Param('id') id: string, @CurrentUser() user: any) {
    return this.operationalPaymentsService.submitForApproval(id, user.userId);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DIRECTOR)
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApprovePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.operationalPaymentsService.approve(id, approveDto, user.userId);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DIRECTOR)
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.operationalPaymentsService.reject(id, rejectDto, user.userId);
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DIRECTOR)
  async markAsPaid(
    @Param('id') id: string,
    @Body() markPaidDto: MarkPaidDto,
    @CurrentUser() user: any,
  ) {
    return this.operationalPaymentsService.markAsPaid(
      id,
      markPaidDto,
      user.userId,
    );
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR)
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.operationalPaymentsService.cancel(id, user.userId);
  }

  @Post(':id/files')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DIRECTOR, UserRole.MANAGER)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/operational-payments',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.operationalPaymentsService.uploadFile(id, file, user.userId);
  }

  @Delete(':id/files/:fileId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DIRECTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    await this.operationalPaymentsService.deleteFile(id, fileId, user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.DIRECTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.operationalPaymentsService.remove(id, user.userId);
  }
}
