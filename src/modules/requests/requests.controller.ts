import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { resolve } from 'path';
import type { Response } from 'express';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { UpdateRequestStatusDto } from './dto/update-status.dto';
import { FilterRequestDto } from './dto/filter-request.dto';
import { MoveRequestDto } from './dto/move-request.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { RequestType } from './schemas/request.schema';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Permissions('requests.create')
  async create(
    @Body() createDto: CreateRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.create(createDto, user.userId);
  }

  @Get()
  async findAll(@Query() filterDto: FilterRequestDto) {
    return this.requestsService.findAll(filterDto);
  }

  @Get('kanban')
  async getKanban(@Query('type') type: RequestType) {
    return this.requestsService.getKanban(type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Get(':id/detail')
  async getDetail(@Param('id') id: string) {
    return this.requestsService.getRequestDetail(id);
  }

  @Patch(':id')
  @Permissions('requests.update')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.update(id, updateDto, user.userId);
  }

  @Patch(':id/status')
  @Permissions('requests.update')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateRequestStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.updateStatus(id, updateStatusDto.toKey, user.userId);
  }

  @Patch(':id/move')
  @Permissions('requests.update')
  async moveRequest(
    @Param('id') id: string,
    @Body() moveDto: MoveRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.moveRequest(id, moveDto, user.userId);
  }

  @Post(':id/comments')
  @Permissions('requests.create')
  async addComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.addComment(id, addCommentDto, user.userId);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.requestsService.getComments(id);
  }

  @Post(':id/files')
  @Permissions('requests.create')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  async uploadFiles(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }
    return this.requestsService.addFiles(id, files, user.userId);
  }

  @Get(':id/files')
  async getFiles(@Param('id') id: string) {
    return this.requestsService.getFiles(id);
  }

  @Get(':id/files/:fileId')
  async getFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.requestsService.getFile(id, fileId);
    const filePath = resolve(file.path);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.originalName)}"`,
    );
    return res.sendFile(filePath);
  }

  @Get(':id/files/:fileId/download')
  async downloadFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.requestsService.getFile(id, fileId);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    );
    res.sendFile(file.path, { root: '.' });
  }

  @Delete(':id/files/:fileId')
  @Permissions('requests.delete')
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.removeFile(id, fileId, user.userId);
  }

  @Delete(':id')
  @Permissions('requests.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.requestsService.remove(id);
  }
}
