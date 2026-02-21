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
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { OperationalPaymentsService } from './operational-payments.service';
import { CreateOperationalPaymentDto } from './dto/create-operational-payment.dto';
import { UpdateOperationalPaymentDto } from './dto/update-operational-payment.dto';
import { FilterOperationalPaymentDto } from './dto/filter-operational-payment.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Operational Payments')
@ApiBearerAuth()
@Controller('operational-payments')
export class OperationalPaymentsController {
  constructor(
    private readonly operationalPaymentsService: OperationalPaymentsService,
  ) {}

  @Post()
  @Permissions('operational-payments.create')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
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
  async create(
    @Body() createDto: CreateOperationalPaymentDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @CurrentUser() user: any,
  ) {
    return this.operationalPaymentsService.create(createDto, files || [], user.userId || user.sub, user.companyId);
  }

  @Get()
  async findAll(@Query() filterDto: FilterOperationalPaymentDto, @CurrentUser() user: any) {
    return this.operationalPaymentsService.findAll(filterDto, user.companyId);
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
  @Permissions('operational-payments.update')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
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
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOperationalPaymentDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @CurrentUser() user: any,
  ) {
    return this.operationalPaymentsService.update(id, updateDto, files || [], user.userId);
  }

  @Post(':id/files')
  @Permissions('operational-payments.create')
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
  @Permissions('operational-payments.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    await this.operationalPaymentsService.deleteFile(id, fileId, user.userId);
  }

  @Delete(':id')
  @Permissions('operational-payments.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.operationalPaymentsService.remove(id, user.userId);
  }
}
