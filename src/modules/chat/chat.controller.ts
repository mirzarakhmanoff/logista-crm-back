import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetConversationsDto } from './dto/get-conversations.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== CONVERSATIONS ====================

  @Post('conversations')
  @ApiOperation({ summary: 'Yangi suhbat yaratish (private yoki group)' })
  @ApiResponse({ status: 201, description: 'Suhbat yaratildi' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: any,
  ) {
    return this.chatService.createConversation(dto, user.userId);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Foydalanuvchi suhbatlari (oxirgi xabar va unread count bilan)',
  })
  async getConversations(
    @Query() query: GetConversationsDto,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getUserConversations(user.userId, query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Suhbat tafsilotlari' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getConversationById(id, user.userId);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Guruh suhbatni yangilash' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async updateConversation(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: any,
  ) {
    return this.chatService.updateConversation(id, dto, user.userId);
  }

  // ==================== MESSAGES ====================

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Suhbat xabarlari (pagination bilan)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async getMessages(
    @Param('id') conversationId: string,
    @Query() query: GetMessagesDto,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getMessages(
      conversationId,
      user.userId,
      query,
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'Xabar yuborish' })
  @ApiResponse({ status: 201, description: 'Xabar yuborildi' })
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.chatService.sendMessage(dto, user.userId);
  }

  @Post('messages/with-attachments')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Fayllar bilan xabar yuborish' })
  @ApiResponse({ status: 201, description: 'Xabar yuborildi' })
  async sendMessageWithAttachments(
    @Body() dto: SendMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    return this.chatService.sendMessageWithAttachments(
      dto,
      files || [],
      user.userId,
    );
  }

  // ==================== READ / UNREAD ====================

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Suhbat xabarlarini o\'qilgan deb belgilash' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.markConversationAsRead(
      conversationId,
      user.userId,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Jami o\'qilmagan xabarlar soni' })
  async getUnreadCount(@CurrentUser() user: any) {
    return this.chatService.getTotalUnreadCount(user.userId);
  }

  // ==================== ONLINE ====================

  @Get('users/online')
  @ApiOperation({ summary: 'Online foydalanuvchilar ro\'yxati' })
  async getOnlineUsers() {
    return this.chatService.getOnlineUsers();
  }
}
