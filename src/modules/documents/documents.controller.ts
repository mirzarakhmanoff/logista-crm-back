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
  UploadedFiles,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { resolve } from 'path';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentStatus } from './schemas/document.schema';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({
    status: 201,
    description: 'Document created successfully',
  })
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.create(createDocumentDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
  })
  async findAll(@Query() filterDto: FilterDocumentDto) {
    return this.documentsService.findAll(filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics by status' })
  @ApiResponse({
    status: 200,
    description: 'Document statistics',
  })
  async getStats() {
    return this.documentsService.getDocumentStats();
  }

  @Get('by-status/:status')
  @ApiOperation({ summary: 'Get documents by status' })
  @ApiResponse({
    status: 200,
    description: 'Documents filtered by status',
  })
  async getByStatus(@Param('status') status: DocumentStatus) {
    return this.documentsService.getDocumentsByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({
    status: 200,
    description: 'Document details',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update document by ID' })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.update(id, updateDocumentDto, user.userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update document status' })
  @ApiResponse({
    status: 200,
    description: 'Document status updated successfully',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.updateStatus(id, updateStatusDto, user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete document by ID (Admin/Manager only)' })
  @ApiResponse({
    status: 204,
    description: 'Document deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async remove(@Param('id') id: string) {
    await this.documentsService.remove(id);
  }

  @Post(':id/files')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file(s) to document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File(s) uploaded successfully',
  })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    const fileDataList = files.map((file) => ({
      filename: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: user.userId,
    }));

    return this.documentsService.addFiles(id, fileDataList);
  }

  @Get(':id/files/:fileId/download')
  @ApiOperation({ summary: 'Download file from document' })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async downloadFile(
    @Param('id') documentId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const fileData = await this.documentsService.getFile(documentId, fileId);

    res.setHeader('Content-Type', fileData.mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileData.filename)}"`,
    );
    res.sendFile(fileData.path, { root: '.' });
  }

  @Delete(':id/files/:fileId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Delete file from document' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  async deleteFile(
    @Param('id') documentId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.removeFile(documentId, fileId, user.userId);
  }

  @Get(':id/files/:fileId')
  @ApiOperation({ summary: 'Download file from document' })
  @ApiResponse({
    status: 200,
    description: 'File stream',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async getFile(
    @Param('id') documentId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.documentsService.getFile(documentId, fileId);
    const filePath = resolve(file.path);
    res.setHeader('Content-Type', file.mimetype);
    return res.sendFile(filePath);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get document activities (logs and comments)' })
  @ApiResponse({
    status: 200,
    description: 'Document activities',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getActivities(@Param('id') id: string) {
    return this.documentsService.getActivities(id);
  }

  @Post(':id/activities/comments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Add comment to document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Comment added successfully',
  })
  async addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.addComment(id, content, user.userId);
  }
}
