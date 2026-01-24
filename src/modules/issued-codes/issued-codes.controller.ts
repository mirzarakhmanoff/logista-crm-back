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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Issued Codes')
@ApiBearerAuth()
@Controller()
export class IssuedCodesController {
  constructor(private readonly issuedCodesService: IssuedCodesService) {}

  @Post('requests/:requestId/codes')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async create(
    @Param('requestId') requestId: string,
    @Body() createDto: Omit<CreateIssuedCodeDto, 'requestId'>,
    @CurrentUser() user: any,
  ) {
    return this.issuedCodesService.create(
      { ...createDto, requestId },
      user.userId,
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateIssuedCodeDto,
    @CurrentUser() user: any,
  ) {
    return this.issuedCodesService.update(id, updateDto, user.userId);
  }

  @Delete('codes/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.issuedCodesService.remove(id);
  }
}
