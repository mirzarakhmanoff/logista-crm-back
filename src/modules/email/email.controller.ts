import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as path from 'path';
import { EmailService } from './email.service';
import { CreateEmailAccountDto } from './dto/create-email-account.dto';
import { UpdateEmailAccountDto } from './dto/update-email-account.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { FilterEmailDto } from './dto/filter-email.dto';
import { LinkEmailDto } from './dto/link-email.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Email')
@ApiBearerAuth('JWT')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // ==================== ACCOUNT ENDPOINTS ====================

  @Post('accounts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Yangi email akkaunt qo\'shish' })
  @ApiResponse({ status: 201, description: 'Akkaunt yaratildi' })
  async createAccount(
    @Body() dto: CreateEmailAccountDto,
    @CurrentUser() user: any,
  ) {
    return this.emailService.createAccount(dto, user.userId);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Barcha email akkauntlarni olish' })
  @ApiResponse({ status: 200, description: 'Email akkauntlar ro\'yxati' })
  async getAccounts() {
    return this.emailService.findAllAccounts();
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Email akkauntni ID bo\'yicha olish' })
  @ApiResponse({ status: 200, description: 'Email akkaunt ma\'lumotlari' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  async getAccount(@Param('id') id: string) {
    return this.emailService.findAccountById(id);
  }

  @Patch('accounts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Email akkauntni yangilash' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateEmailAccountDto,
  ) {
    return this.emailService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Email akkauntni o\'chirish (barcha xatlar bilan)',
  })
  @ApiParam({ name: 'id', description: 'Account ID' })
  async deleteAccount(@Param('id') id: string) {
    await this.emailService.deleteAccount(id);
  }

  @Post('accounts/:id/test')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'IMAP/SMTP ulanishni tekshirish' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  async testConnection(@Param('id') id: string) {
    return this.emailService.testAccountConnection(id);
  }

  @Post('accounts/:id/sync')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Akkauntni qo\'lda sinxronlashtirish' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  async triggerSync(@Param('id') id: string) {
    return this.emailService.triggerSync(id);
  }

  // ==================== GMAIL OAUTH2 ====================

  @Get('oauth/google/url')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Google OAuth2 ruxsat URL olish' })
  @ApiResponse({ status: 200, description: 'OAuth2 URL' })
  async getGoogleAuthUrl(@CurrentUser() user: any) {
    const url = this.emailService.getGmailAuthUrl(user.userId);
    return { url };
  }

  @Get('oauth/google/callback')
  @Public()
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.emailService.getFrontendUrl();
    try {
      const account = await this.emailService.handleGmailCallback(code, state);
      res.redirect(`${frontendUrl}/email?oauth=success&account=${account._id}`);
    } catch (error) {
      res.redirect(`${frontendUrl}/email?oauth=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  // ==================== MESSAGE ENDPOINTS ====================

  @Get('messages')
  @ApiOperation({ summary: 'Barcha xatlarni filtrlash bilan olish' })
  @ApiResponse({ status: 200, description: 'Sahifalangan xatlar ro\'yxati' })
  async getMessages(@Query() filterDto: FilterEmailDto) {
    return this.emailService.findAllMessages(filterDto);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Xatni ID bo\'yicha olish' })
  @ApiResponse({ status: 200, description: 'Xat ma\'lumotlari' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async getMessage(@Param('id') id: string) {
    return this.emailService.findMessageById(id);
  }

  @Get('messages/:id/thread')
  @ApiOperation({ summary: 'Xat zanjirini olish (barcha bog\'langan xatlar)' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async getThread(@Param('id') id: string) {
    return this.emailService.getThread(id);
  }

  @Post('messages/send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Yangi xat jo\'natish' })
  @ApiResponse({ status: 201, description: 'Xat jo\'natildi' })
  async sendEmail(
    @Body() dto: SendEmailDto,
    @CurrentUser() user: any,
  ) {
    return this.emailService.sendEmail(dto, user.userId);
  }

  @Post('messages/send-with-attachments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Fayllar bilan xat jo\'natish' })
  @ApiResponse({ status: 201, description: 'Xat jo\'natildi' })
  async sendEmailWithAttachments(
    @Body() dto: SendEmailDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    return this.emailService.sendEmailWithAttachments(
      dto,
      files || [],
      user.userId,
    );
  }

  @Post('messages/reply')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Xatga javob yozish' })
  @ApiResponse({ status: 201, description: 'Javob jo\'natildi' })
  async replyToEmail(
    @Body() dto: ReplyEmailDto,
    @CurrentUser() user: any,
  ) {
    return this.emailService.replyToEmail(dto, user.userId);
  }

  // ==================== CRM LINKING ====================

  @Post('messages/:id/link')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Xatni CRM obyektiga bog\'lash (client yoki request)',
  })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async linkEmail(
    @Param('id') id: string,
    @Body() dto: LinkEmailDto,
  ) {
    return this.emailService.linkEmailToEntity(id, dto);
  }

  @Delete('messages/:id/link/:entityType/:entityId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Xatni CRM obyektidan uzish' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiParam({ name: 'entityType', description: 'CLIENT yoki REQUEST' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  async unlinkEmail(
    @Param('id') id: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.emailService.unlinkEmailFromEntity(
      id,
      entityType,
      entityId,
    );
  }

  @Get('by-client/:clientId')
  @ApiOperation({ summary: 'Klientga bog\'langan barcha xatlar' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getEmailsByClient(
    @Param('clientId') clientId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.emailService.getEmailsByClient(
      clientId,
      page || 1,
      limit || 20,
    );
  }

  @Get('by-request/:requestId')
  @ApiOperation({ summary: 'So\'rovga bog\'langan barcha xatlar' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getEmailsByRequest(
    @Param('requestId') requestId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.emailService.getEmailsByRequest(
      requestId,
      page || 1,
      limit || 20,
    );
  }

  // ==================== STATUS ====================

  @Patch('messages/:id/read')
  @ApiOperation({ summary: 'Xatni o\'qilgan deb belgilash' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async markAsRead(@Param('id') id: string) {
    return this.emailService.markAsRead(id);
  }

  @Patch('messages/:id/unread')
  @ApiOperation({ summary: 'Xatni o\'qilmagan deb belgilash' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async markAsUnread(@Param('id') id: string) {
    return this.emailService.markAsUnread(id);
  }

  @Patch('messages/:id/archive')
  @ApiOperation({ summary: 'Xatni arxivlash' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async archiveEmail(@Param('id') id: string) {
    return this.emailService.archiveEmail(id);
  }

  @Delete('messages/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xatni o\'chirish' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async deleteEmail(@Param('id') id: string) {
    await this.emailService.deleteEmail(id);
  }

  // ==================== STATS ====================

  @Get('stats')
  @ApiOperation({ summary: 'Email statistikasi (dashboard uchun)' })
  async getStats() {
    return this.emailService.getEmailStats();
  }

  // ==================== ATTACHMENTS ====================

  @Get('messages/:messageId/attachments/:index/download')
  @ApiOperation({ summary: 'Email attachment yuklash' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiParam({ name: 'index', description: 'Attachment index (0-based)' })
  async downloadAttachment(
    @Param('messageId') messageId: string,
    @Param('index') index: number,
    @Res() res: Response,
  ) {
    const message = await this.emailService.findMessageById(messageId);

    if (!message.attachments || index >= message.attachments.length) {
      res.status(HttpStatus.NOT_FOUND).json({
        message: 'Attachment topilmadi',
      });
      return;
    }

    const attachment = message.attachments[index];
    const filePath = path.resolve(attachment.path);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
    );
    res.setHeader(
      'Content-Type',
      attachment.mimetype || 'application/octet-stream',
    );
    res.sendFile(filePath);
  }
}
