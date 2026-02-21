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
import { IssuedCodesService } from './issued-codes.service';
import { CreateIssuedCodeDto } from './dto/create-issued-code.dto';
import { UpdateIssuedCodeDto } from './dto/update-issued-code.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Issued Codes')
@ApiBearerAuth()
@Controller()
export class IssuedCodesController {
  constructor(private readonly issuedCodesService: IssuedCodesService) {}

  @Post('requests/:requestId/codes')
  @Permissions('issued-codes.create')
  async create(
    @Param('requestId') requestId: string,
    @Body() createDto: Omit<CreateIssuedCodeDto, 'requestId'>,
    @CurrentUser() user: any,
  ) {
    return this.issuedCodesService.create(
      { ...createDto, requestId },
      user.userId || user.sub,
      user.companyId,
    );
  }

  @Get('requests/:requestId/codes')
  async findByRequest(@Param('requestId') requestId: string) {
    return this.issuedCodesService.findByRequest(requestId);
  }

  @Get('codes')
  async getActiveCodes() {
    return this.issuedCodesService.getActiveCodes();
  }

  @Get('codes/search/:code')
  async findByCode(@Param('code') code: string) {
    return this.issuedCodesService.findByCode(code);
  }

  @Get('codes/:id')
  async findOne(@Param('id') id: string) {
    return this.issuedCodesService.findOne(id);
  }

  @Patch('codes/:id')
  @Permissions('issued-codes.update')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateIssuedCodeDto,
    @CurrentUser() user: any,
  ) {
    return this.issuedCodesService.update(id, updateDto, user.userId);
  }

  @Delete('codes/:id')
  @Permissions('issued-codes.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.issuedCodesService.remove(id);
  }
}
