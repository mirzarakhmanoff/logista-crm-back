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
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PersonnelDocumentsService } from './personnel-documents.service';
import { CreatePersonnelDocumentCategoryDto } from './dto/create-personnel-document-category.dto';
import { UpdatePersonnelDocumentCategoryDto } from './dto/update-personnel-document-category.dto';
import { CreatePersonnelDocumentDto } from './dto/create-personnel-document.dto';
import { UpdatePersonnelDocumentDto } from './dto/update-personnel-document.dto';
import { FilterPersonnelDocumentDto } from './dto/filter-personnel-document.dto';
import { UpdatePersonnelDocumentStatusDto } from './dto/update-personnel-document-status.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Personnel Documents')
@ApiBearerAuth()
@Controller('personnel-documents')
export class PersonnelDocumentsController {
  constructor(private readonly service: PersonnelDocumentsService) {}

  // ==================== CATEGORIES ====================

  @Post('categories')
  @Permissions('personnel-documents.create')
  @ApiOperation({ summary: 'Create a personnel document category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(
    @Body() dto: CreatePersonnelDocumentCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createCategory(dto, user.userId, user.companyId);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get all personnel document categories with document counts',
  })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async findAllCategories(@CurrentUser() user: any) {
    return this.service.findAllCategories(user.companyId);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  async findCategoryById(@Param('id') id: string) {
    return this.service.findCategoryById(id);
  }

  @Patch('categories/:id')
  @Permissions('personnel-documents.update')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdatePersonnelDocumentCategoryDto,
  ) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Permissions('personnel-documents.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  async removeCategory(@Param('id') id: string) {
    await this.service.removeCategory(id);
  }

  // ==================== GLOBAL STATS ====================

  @Get('stats')
  @ApiOperation({
    summary: 'Get global stats (total, active, under review, archived)',
  })
  @ApiResponse({ status: 200, description: 'Global statistics' })
  async getGlobalStats(@CurrentUser() user: any) {
    return this.service.getGlobalStats(user.companyId);
  }

  @Get('stats/by-status')
  @ApiOperation({ summary: 'Get document counts by status' })
  @ApiResponse({ status: 200, description: 'Status statistics' })
  async getStatsByStatus(
    @CurrentUser() user: any,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.getDocumentStatsByStatus(user.companyId, categoryId);
  }

  @Get('categories/:id/stats')
  @ApiOperation({
    summary: 'Get category stats (total, active, under review)',
  })
  @ApiResponse({ status: 200, description: 'Category statistics' })
  async getCategoryStats(@Param('id') id: string) {
    return this.service.getCategoryStats(id);
  }

  // ==================== DOCUMENTS ====================

  @Post()
  @Permissions('personnel-documents.create')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create personnel document with optional files' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'category'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        assignedTo: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  async createDocument(
    @Body() dto: CreatePersonnelDocumentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    const document = await this.service.createDocument(dto, user.userId || user.sub, user.companyId);

    if (files && files.length > 0) {
      const fileDataList = files.map((file) => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: user.userId || user.sub,
      }));
      return this.service.addFiles(document._id.toString(), fileDataList);
    }

    return document;
  }

  @Get()
  @ApiOperation({ summary: 'Get all personnel documents with filters' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async findAllDocuments(@Query() filterDto: FilterPersonnelDocumentDto, @CurrentUser() user: any) {
    return this.service.findAllDocuments(filterDto, user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get personnel document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findDocumentById(@Param('id') id: string) {
    return this.service.findDocumentById(id);
  }

  @Patch(':id')
  @Permissions('personnel-documents.update')
  @ApiOperation({ summary: 'Update personnel document' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdatePersonnelDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateDocument(id, dto, user.userId);
  }

  @Patch(':id/status')
  @Permissions('personnel-documents.update')
  @ApiOperation({ summary: 'Update document status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateDocumentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePersonnelDocumentStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateDocumentStatus(id, dto, user.userId);
  }

  @Delete(':id')
  @Permissions('personnel-documents.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete personnel document' })
  @ApiResponse({ status: 204, description: 'Document deleted successfully' })
  async removeDocument(@Param('id') id: string) {
    await this.service.removeDocument(id);
  }

  // ==================== FILE MANAGEMENT ====================

  @Post(':id/files')
  @Permissions('personnel-documents.create')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file(s) to personnel document' })
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
  @ApiResponse({ status: 200, description: 'File(s) uploaded successfully' })
  async uploadFiles(
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

    return this.service.addFiles(id, fileDataList);
  }

  @Get(':id/files/:fileId/download')
  @ApiOperation({ summary: 'Download file from personnel document' })
  @ApiResponse({ status: 200, description: 'File downloaded' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('id') documentId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const fileData = await this.service.getFile(documentId, fileId);
    res.setHeader('Content-Type', fileData.mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileData.filename)}"`,
    );
    res.sendFile(fileData.path, { root: '.' });
  }

  @Get(':id/files/:fileId')
  @ApiOperation({ summary: 'Preview file from personnel document' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('id') documentId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.service.getFile(documentId, fileId);
    const filePath = resolve(file.path);
    res.setHeader('Content-Type', file.mimetype);
    return res.sendFile(filePath);
  }

  @Delete(':id/files/:fileId')
  @Permissions('personnel-documents.delete')
  @ApiOperation({ summary: 'Delete file from personnel document' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(
    @Param('id') documentId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.removeFile(documentId, fileId, user.userId);
  }

  // ==================== ACTIVITIES ====================

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get document activities (logs and comments)' })
  @ApiResponse({ status: 200, description: 'Document activities' })
  async getActivities(@Param('id') id: string) {
    return this.service.getActivities(id);
  }

  @Post(':id/activities/comments')
  @Permissions('personnel-documents.create')
  @ApiOperation({ summary: 'Add comment to personnel document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  async addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @CurrentUser() user: any,
  ) {
    return this.service.addComment(id, content, user.userId);
  }
}
