import { Types } from 'mongoose';

export enum EmailProvider {
  GMAIL = 'gmail',
  MAILRU = 'mailru',
  CORPORATE = 'corporate',
  CUSTOM = 'custom',
}

export enum EmailAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

export enum EmailDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum EmailStatus {
  UNREAD = 'unread',
  READ = 'read',
  REPLIED = 'replied',
  FORWARDED = 'forwarded',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export interface EmailAttachment {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  contentId?: string;
}

export interface ImapConnectionConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass?: string;
    accessToken?: string;
  };
}

export interface SmtpConnectionConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass?: string;
    type?: string;
    accessToken?: string;
  };
}

export interface ParsedEmail {
  messageId: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  cc?: { name?: string; address: string }[];
  bcc?: { name?: string; address: string }[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  date: Date;
  inReplyTo?: string;
  references?: string[];
  attachments: EmailAttachment[];
  headers: Record<string, string>;
  uid: number;
  flags: string[];
}

export interface EmailSyncResult {
  accountId: string;
  newMessages: number;
  errors: string[];
  syncedAt: Date;
}

export interface LinkedEntity {
  entityType: 'CLIENT' | 'REQUEST';
  entityId: Types.ObjectId;
}
