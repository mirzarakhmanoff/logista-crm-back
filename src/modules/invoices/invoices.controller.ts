import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('requests/:requestId/invoices')
  @Permissions('invoices.create')
  async create(
    @Param('requestId') requestId: string,
    @Body() createDto: Omit<CreateInvoiceDto, 'requestId'>,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.create(
      { ...createDto, requestId },
      user.userId,
    );
  }

  @Get('requests/:requestId/invoices')
  async findByRequest(@Param('requestId') requestId: string) {
    return this.invoicesService.findByRequest(requestId);
  }

  @Get('invoices/unpaid')
  async getUnpaid() {
    return this.invoicesService.getUnpaid();
  }

  @Get('invoices/:id')
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch('invoices/:id')
  @Permissions('invoices.update')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInvoiceDto,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.update(id, updateDto, user.userId);
  }

  @Patch('invoices/:id/pay')
  @Permissions('invoices.update')
  async pay(
    @Param('id') id: string,
    @Body() payDto: PayInvoiceDto,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.pay(id, payDto, user.userId);
  }

  @Delete('invoices/:id')
  @Permissions('invoices.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.invoicesService.remove(id);
  }
}
