import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.SOCKET_IO_CORS || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/documents',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SocketGateway');

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify(token);
        const companyId = payload?.companyId;
        if (companyId) {
          client.join(`company-${companyId}`);
          client.data.companyId = companyId;
          this.logger.log(`Client ${client.id} connected → company-${companyId}`);
          return;
        }
      }
    } catch {
      // invalid token — still connect, just no company room
    }
    this.logger.log(`Client connected (no company): ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Company-scoped broadcast (asosiy method)
  emitToCompany(companyId: string, event: string, data: any) {
    this.server.to(`company-${companyId}`).emit(event, data);
  }

  // Backward-compat: hali companyId berilmagan joylarda ishlaydi
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Client dokumentga join bo'ladi (room)
  @SubscribeMessage('joinDocument')
  handleJoinDocument(
    @MessageBody() documentId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`document-${documentId}`);
    this.logger.log(`Client ${client.id} joined document-${documentId}`);
    return { event: 'joinedDocument', data: documentId };
  }

  // Client dokumentdan leave bo'ladi
  @SubscribeMessage('leaveDocument')
  handleLeaveDocument(
    @MessageBody() documentId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`document-${documentId}`);
    this.logger.log(`Client ${client.id} left document-${documentId}`);
    return { event: 'leftDocument', data: documentId };
  }

  // Ma'lum bir dokumentga tegishli clientlarga xabar
  emitToDocument(documentId: string, event: string, data: any) {
    this.server.to(`document-${documentId}`).emit(event, data);
  }

  // Status o'zgarganda
  emitDocumentStatusChanged(documentId: string, data: any) {
    this.emitToDocument(documentId, 'documentStatusChanged', data);
    this.logger.log(`Status changed for document ${documentId}`);
  }

  // Yangi comment qo'shilganda
  emitNewComment(documentId: string, data: any) {
    this.emitToDocument(documentId, 'newComment', data);
    this.logger.log(`New comment added to document ${documentId}`);
  }

  // Yangi activity qo'shilganda
  emitNewActivity(documentId: string, data: any) {
    this.emitToDocument(documentId, 'newActivity', data);
    this.logger.log(`New activity added to document ${documentId}`);
  }

  // Dokument yangilanganda
  emitDocumentUpdated(documentId: string, data: any) {
    this.emitToDocument(documentId, 'documentUpdated', data);
    this.logger.log(`Document ${documentId} updated`);
  }

  // Fayl yuklanganda
  emitFileUploaded(documentId: string, data: any) {
    this.emitToDocument(documentId, 'fileUploaded', data);
    this.logger.log(`File uploaded to document ${documentId}`);
  }

  // Fayl o'chirilganda
  emitFileDeleted(documentId: string, data: any) {
    this.emitToDocument(documentId, 'fileDeleted', data);
    this.logger.log(`File deleted from document ${documentId}`);
  }

  // Yangi dokument yaratilganda
  emitDocumentCreated(companyId: string, data: any) {
    this.emitToCompany(companyId, 'documentCreated', data);
    this.logger.log(`New document created: ${data._id}`);
  }

  // Dokument o'chirilganda
  emitDocumentDeleted(companyId: string, documentId: string) {
    this.emitToCompany(companyId, 'documentDeleted', { documentId });
    this.logger.log(`Document deleted: ${documentId}`);
  }

  // ==================== EMAIL EVENTS ====================

  emitNewEmailReceived(companyId: string, data: {
    accountId: string;
    accountName: string;
    messageId: string;
    from: string;
    subject: string;
    date: Date;
  }) {
    this.emitToCompany(companyId, 'newEmailReceived', data);
    this.logger.log(`New email received: ${data.subject} from ${data.from}`);
  }

  emitNewEmailsReceived(companyId: string, data: {
    accountId: string;
    accountName: string;
    count: number;
  }) {
    this.emitToCompany(companyId, 'newEmailsReceived', data);
    this.logger.log(`${data.count} new emails received for account ${data.accountName}`);
  }

  emitEmailSent(companyId: string, data: {
    messageId: string;
    to: string[];
    subject: string;
  }) {
    this.emitToCompany(companyId, 'emailSent', data);
    this.logger.log(`Email sent: ${data.subject}`);
  }

  emitEmailLinked(companyId: string, data: {
    messageId: string;
    entityType: string;
    entityId: string;
  }) {
    this.emitToCompany(companyId, 'emailLinked', data);
    this.logger.log(`Email ${data.messageId} linked to ${data.entityType}:${data.entityId}`);
  }

  emitEmailSyncError(companyId: string, data: {
    accountId: string;
    accountName: string;
    error: string;
  }) {
    this.emitToCompany(companyId, 'emailSyncError', data);
    this.logger.warn(`Email sync error for ${data.accountName}: ${data.error}`);
  }

  // Email akkauntga subscribe bo'lish
  @SubscribeMessage('joinEmailAccount')
  handleJoinEmailAccount(
    @MessageBody() accountId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`email-account-${accountId}`);
    this.logger.log(`Client ${client.id} joined email-account-${accountId}`);
    return { event: 'joinedEmailAccount', data: accountId };
  }

  // Email akkauntdan unsubscribe bo'lish
  @SubscribeMessage('leaveEmailAccount')
  handleLeaveEmailAccount(
    @MessageBody() accountId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`email-account-${accountId}`);
    this.logger.log(`Client ${client.id} left email-account-${accountId}`);
    return { event: 'leftEmailAccount', data: accountId };
  }

  // ==================== NOTIFICATION EVENTS ====================

  emitNewNotification(companyId: string, data: any) {
    this.emitToCompany(companyId, 'newNotification', data);
    this.logger.log(`New notification: ${data?.title}`);
  }
}
