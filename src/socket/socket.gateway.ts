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
}
