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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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

  // Barcha clientlarga xabar (broadcast)
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
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

  // Yangi dokument yaratilganda (global)
  emitDocumentCreated(data: any) {
    this.emitToAll('documentCreated', data);
    this.logger.log(`New document created: ${data._id}`);
  }

  // Dokument o'chirilganda (global)
  emitDocumentDeleted(documentId: string) {
    this.emitToAll('documentDeleted', { documentId });
    this.logger.log(`Document deleted: ${documentId}`);
  }

  // ==================== EMAIL EVENTS ====================

  // Yangi email kelganda
  emitNewEmailReceived(data: {
    accountId: string;
    accountName: string;
    messageId: string;
    from: string;
    subject: string;
    date: Date;
  }) {
    this.emitToAll('newEmailReceived', data);
    this.logger.log(`New email received: ${data.subject} from ${data.from}`);
  }

  // Bir nechta yangi email kelganda (sync natijasi)
  emitNewEmailsReceived(data: {
    accountId: string;
    accountName: string;
    count: number;
  }) {
    this.emitToAll('newEmailsReceived', data);
    this.logger.log(
      `${data.count} new emails received for account ${data.accountName}`,
    );
  }

  // Email jo'natilganda
  emitEmailSent(data: {
    messageId: string;
    to: string[];
    subject: string;
  }) {
    this.emitToAll('emailSent', data);
    this.logger.log(`Email sent: ${data.subject}`);
  }

  // Email CRM obyektiga bog'langanda
  emitEmailLinked(data: {
    messageId: string;
    entityType: string;
    entityId: string;
  }) {
    this.emitToAll('emailLinked', data);
    this.logger.log(
      `Email ${data.messageId} linked to ${data.entityType}:${data.entityId}`,
    );
  }

  // Email sync xatolik
  emitEmailSyncError(data: {
    accountId: string;
    accountName: string;
    error: string;
  }) {
    this.emitToAll('emailSyncError', data);
    this.logger.warn(
      `Email sync error for ${data.accountName}: ${data.error}`,
    );
  }

  // Email akkauntga subscribe bo'lish
  @SubscribeMessage('joinEmailAccount')
  handleJoinEmailAccount(
    @MessageBody() accountId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`email-account-${accountId}`);
    this.logger.log(
      `Client ${client.id} joined email-account-${accountId}`,
    );
    return { event: 'joinedEmailAccount', data: accountId };
  }

  // Email akkauntdan unsubscribe bo'lish
  @SubscribeMessage('leaveEmailAccount')
  handleLeaveEmailAccount(
    @MessageBody() accountId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`email-account-${accountId}`);
    this.logger.log(
      `Client ${client.id} left email-account-${accountId}`,
    );
    return { event: 'leftEmailAccount', data: accountId };
  }

  // ==================== NOTIFICATION EVENTS ====================

  // Yangi notification yaratilganda
  emitNewNotification(data: any) {
    this.emitToAll('newNotification', data);
    this.logger.log(`New notification: ${data?.title}`);
  }
}
