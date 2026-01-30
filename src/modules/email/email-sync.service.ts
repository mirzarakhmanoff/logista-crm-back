import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { EmailAccount } from './schemas/email-account.schema';
import { EmailMessage } from './schemas/email-message.schema';
import { Client } from '../clients/schemas/client.schema';
import { EmailImapService } from './email-imap.service';
import { EmailOAuthService } from './email-oauth.service';
import { SocketGateway } from '../../socket/socket.gateway';
import {
  EmailAccountStatus,
  EmailDirection,
  EmailStatus,
  EmailProvider,
  EmailSyncResult,
  ParsedEmail,
} from './interfaces/email.interfaces';

@Injectable()
export class EmailSyncService {
  private logger = new Logger('EmailSyncService');
  private isSyncing = false;

  constructor(
    @InjectModel(EmailAccount.name)
    private accountModel: Model<EmailAccount>,
    @InjectModel(EmailMessage.name)
    private messageModel: Model<EmailMessage>,
    @InjectModel(Client.name)
    private clientModel: Model<Client>,
    private emailImapService: EmailImapService,
    private emailOAuthService: EmailOAuthService,
    private socketGateway: SocketGateway,
    private configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async syncAllAccounts(): Promise<void> {
    if (this.isSyncing) {
      this.logger.debug('Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    try {
      const accounts = await this.accountModel
        .find({
          status: EmailAccountStatus.ACTIVE,
          syncEnabled: true,
        })
        .select('+credentials')
        .exec();

      if (accounts.length === 0) {
        return;
      }

      this.logger.log(`Starting sync for ${accounts.length} account(s)`);

      for (const account of accounts) {
        try {
          await this.syncAccount(account);
        } catch (error) {
          this.logger.error(
            `Sync failed for ${account.emailAddress}: ${error.message}`,
          );
          await this.accountModel.findByIdAndUpdate(account._id, {
            lastError: error.message,
            status: EmailAccountStatus.ERROR,
          });
          this.socketGateway.emitToAll('emailSyncError', {
            accountId: account._id,
            accountName: account.name,
            error: error.message,
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async syncSingleAccount(accountId: string): Promise<EmailSyncResult> {
    const account = await this.accountModel
      .findById(accountId)
      .select('+credentials')
      .exec();

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    return this.syncAccount(account);
  }

  async syncAccount(account: EmailAccount): Promise<EmailSyncResult> {
    const result: EmailSyncResult = {
      accountId: account._id.toString(),
      newMessages: 0,
      errors: [],
      syncedAt: new Date(),
    };

    try {
      // Refresh OAuth2 token if needed
      if (
        account.provider === EmailProvider.GMAIL &&
        account.credentials?.refreshToken
      ) {
        const tokenExpiry = account.credentials.tokenExpiry;
        if (
          tokenExpiry &&
          this.emailOAuthService.isTokenExpired(tokenExpiry)
        ) {
          this.logger.log(
            `Refreshing OAuth2 token for ${account.emailAddress}`,
          );
          const newToken =
            await this.emailOAuthService.refreshAccessToken(
              account.credentials.refreshToken,
            );
          await this.accountModel.findByIdAndUpdate(account._id, {
            'credentials.accessToken': newToken.accessToken,
            'credentials.tokenExpiry': newToken.expiry,
          });
          account.credentials.accessToken = newToken.accessToken;
        }
      }

      const imapConfig = this.emailImapService.buildImapConfig(
        account.provider,
        {
          user: account.credentials.user,
          password: account.credentials.password,
          accessToken: account.credentials.accessToken,
        },
        account.imapConfig,
      );

      const attachmentsDir = path.join(
        this.configService.get<string>(
          'EMAIL_ATTACHMENTS_PATH',
          './uploads/email-attachments',
        ),
        account._id.toString(),
      );

      const messages = await this.emailImapService.fetchNewMessages(
        imapConfig,
        account.lastSyncUid,
        'INBOX',
        attachmentsDir,
      );

      let maxUid = account.lastSyncUid;

      for (const msg of messages) {
        try {
          // Deduplicate by messageId
          const exists = await this.messageModel.findOne({
            messageId: msg.messageId,
          });
          if (exists) {
            if (msg.uid > maxUid) maxUid = msg.uid;
            continue;
          }

          // Compute threadId
          const threadId = this.computeThreadId(msg);

          const emailMessage = new this.messageModel({
            accountId: account._id,
            messageId: msg.messageId,
            uid: msg.uid,
            direction: EmailDirection.INBOUND,
            status: msg.flags.includes('\\Seen')
              ? EmailStatus.READ
              : EmailStatus.UNREAD,
            from: msg.from,
            to: msg.to,
            cc: msg.cc || [],
            bcc: msg.bcc || [],
            subject: msg.subject,
            textBody: msg.textBody,
            htmlBody: msg.htmlBody,
            date: msg.date,
            inReplyTo: msg.inReplyTo,
            references: msg.references || [],
            threadId,
            attachments: msg.attachments,
            flags: msg.flags,
            folder: 'INBOX',
            headers: msg.headers,
          });

          const savedMessage = await emailMessage.save();

          // Auto-link to CRM entities
          await this.autoLinkEmail(savedMessage);

          if (msg.uid > maxUid) maxUid = msg.uid;
          result.newMessages++;
        } catch (saveError) {
          if (saveError.code === 11000) {
            // Duplicate messageId, skip
            if (msg.uid > maxUid) maxUid = msg.uid;
            continue;
          }
          result.errors.push(
            `Message ${msg.messageId}: ${saveError.message}`,
          );
        }
      }

      // Update sync state
      await this.accountModel.findByIdAndUpdate(account._id, {
        lastSyncUid: maxUid,
        lastSyncAt: new Date(),
        lastError: null,
        status: EmailAccountStatus.ACTIVE,
      });

      if (result.newMessages > 0) {
        this.socketGateway.emitToAll('newEmailsReceived', {
          accountId: account._id,
          accountName: account.name,
          count: result.newMessages,
        });
        this.logger.log(
          `Synced ${result.newMessages} new messages for ${account.emailAddress}`,
        );
      }
    } catch (error) {
      result.errors.push(error.message);
      throw error;
    }

    return result;
  }

  private computeThreadId(msg: ParsedEmail): string {
    if (msg.references && msg.references.length > 0) {
      return msg.references[0];
    }
    if (msg.inReplyTo) {
      return msg.inReplyTo;
    }
    return msg.messageId;
  }

  private async autoLinkEmail(message: EmailMessage): Promise<void> {
    try {
      // Collect all email addresses from the message
      const addresses: string[] = [];
      if (message.from?.address) addresses.push(message.from.address);
      if (message.to) {
        message.to.forEach((t) => {
          if (t.address) addresses.push(t.address);
        });
      }
      if (message.cc) {
        message.cc.forEach((c) => {
          if (c.address) addresses.push(c.address);
        });
      }

      if (addresses.length === 0) return;

      // Find matching clients
      const clients = await this.clientModel
        .find({
          email: { $in: addresses },
        })
        .exec();

      if (clients.length === 0) return;

      const linkedEntities = clients.map((client) => ({
        entityType: 'CLIENT' as const,
        entityId: client._id as Types.ObjectId,
      }));

      await this.messageModel.findByIdAndUpdate(message._id, {
        $addToSet: { linkedEntities: { $each: linkedEntities } },
      });

      this.logger.debug(
        `Auto-linked email ${message.messageId} to ${clients.length} client(s)`,
      );
    } catch (error) {
      this.logger.warn(
        `Auto-link failed for ${message.messageId}: ${error.message}`,
      );
    }
  }
}
