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
import { RateQuotesService } from './rate-quotes.service';
import { CreateRateQuoteDto } from './dto/create-rate-quote.dto';
import { UpdateRateQuoteDto } from './dto/update-rate-quote.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Rate Quotes')
@ApiBearerAuth()
@Controller()
export class RateQuotesController {
  constructor(private readonly rateQuotesService: RateQuotesService) {}

  @Post('requests/:requestId/quotes')
  @Permissions('rate-quotes.create')
  async create(
    @Param('requestId') requestId: string,
    @Body() createDto: Omit<CreateRateQuoteDto, 'requestId'>,
    @CurrentUser() user: any,
  ) {
    return this.rateQuotesService.create(
      { ...createDto, requestId },
      user.userId,
    );
  }

  @Get('requests/:requestId/quotes')
  async findByRequest(@Param('requestId') requestId: string) {
    return this.rateQuotesService.findByRequest(requestId);
  }

  @Get('quotes/:id')
  async findOne(@Param('id') id: string) {
    return this.rateQuotesService.findOne(id);
  }

  @Patch('quotes/:id')
  @Permissions('rate-quotes.update')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRateQuoteDto,
    @CurrentUser() user: any,
  ) {
    return this.rateQuotesService.update(id, updateDto, user.userId);
  }

  @Delete('quotes/:id')
  @Permissions('rate-quotes.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.rateQuotesService.remove(id);
  }
}
