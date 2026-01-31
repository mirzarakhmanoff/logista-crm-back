export enum ConversationType {
  PRIVATE = 'private',
  GROUP = 'group',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export interface ChatAttachment {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
}
