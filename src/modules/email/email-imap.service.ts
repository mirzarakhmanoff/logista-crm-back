import { Injectable, Logger } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as fs from 'fs';
import * as path from 'path';
import {
  ImapConnectionConfig,
  ParsedEmail,
  EmailAttachment,
  EmailProvider,
} from './interfaces/email.interfaces';

@Injectable()
export class EmailImapService {
  private logger = new Logger('EmailImapService');

  private buildAuth(config: ImapConnectionConfig) {
    const auth: any = { user: config.auth.user };
    if (config.auth.accessToken) {
      auth.accessToken = config.auth.accessToken;
    } else if (config.auth.pass) {
      auth.pass = config.auth.pass;
    }
    return auth;
  }

  async testConnection(config: ImapConnectionConfig): Promise<{ success: boolean; error?: string; details?: string }> {
    const auth = this.buildAuth(config);
    this.logger.log(`IMAP test: host=${config.host}, port=${config.port}, user=${config.auth.user}, authMethod=${auth.accessToken ? 'XOAUTH2' : 'PASSWORD'}`);

    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth,
      logger: false,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });

    try {
      await client.connect();
      const mailboxes = await client.list();
      await client.logout();
      this.logger.log(`IMAP connection test successful for ${config.auth.user}, mailboxes: ${mailboxes.length}`);
      return { success: true, details: `Connected. ${mailboxes.length} folders found.` };
    } catch (error) {
      this.logger.error(
        `IMAP connection test failed for ${config.auth.user}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  async fetchNewMessages(
    config: ImapConnectionConfig,
    sinceUid: number,
    folder: string = 'INBOX',
    attachmentsDir?: string,
  ): Promise<ParsedEmail[]> {
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: this.buildAuth(config),
      logger: false,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });

    const messages: ParsedEmail[] = [];

    try {
      await client.connect();
      this.logger.log(`IMAP connected to ${config.host}`);

      const lock = await client.getMailboxLock(folder);
      try {
        this.logger.log(`Mailbox "${folder}" locked. Total messages: ${(client.mailbox as any)?.exists || 'unknown'}`);

        // Birinchi sync uchun faqat oxirgi 20 ta xabarni olish
        let searchCriteria: any;
        const maxMessages = sinceUid > 0 ? 100 : 20;

        if (sinceUid > 0) {
          searchCriteria = { uid: `${sinceUid + 1}:*` };
        } else {
          // Oxirgi N ta xabarni olish uchun seq range ishlatamiz
          const total = (client.mailbox as any)?.exists || 0;
          if (total === 0) {
            this.logger.log('Mailbox is empty');
            lock.release();
            await client.logout();
            return [];
          }
          const start = Math.max(1, total - maxMessages + 1);
          searchCriteria = { seq: `${start}:*` };
          this.logger.log(`First sync: fetching messages ${start} to ${total}`);
        }

        let count = 0;

        for await (const message of client.fetch(searchCriteria, {
          uid: true,
          flags: true,
          envelope: true,
          source: true,
        })) {
          if (count >= maxMessages) break;
          this.logger.log(`Fetching message ${count + 1}, UID: ${message.uid}`);

          try {
            const parsed = await simpleParser(message.source);

            const attachments: EmailAttachment[] = [];
            if (parsed.attachments && attachmentsDir) {
              if (!fs.existsSync(attachmentsDir)) {
                fs.mkdirSync(attachmentsDir, { recursive: true });
              }

              for (const att of parsed.attachments) {
                const safeName = (att.filename || 'attachment').replace(
                  /[^a-zA-Z0-9._-]/g,
                  '_',
                );
                const filename = `${message.uid}-${safeName}`;
                const filePath = path.join(attachmentsDir, filename);
                fs.writeFileSync(filePath, att.content);

                attachments.push({
                  filename: att.filename || 'attachment',
                  path: filePath.replace(/\\/g, '/'),
                  mimetype: att.contentType || 'application/octet-stream',
                  size: att.size || 0,
                  contentId: att.contentId,
                });
              }
            }

            const fromAddress = parsed.from?.value?.[0] || {
              name: '',
              address: '',
            };
            const toAddresses = (parsed.to
              ? Array.isArray(parsed.to)
                ? parsed.to
                : [parsed.to]
              : []
            ).flatMap((t) => t.value || []);
            const ccAddresses = (parsed.cc
              ? Array.isArray(parsed.cc)
                ? parsed.cc
                : [parsed.cc]
              : []
            ).flatMap((c) => c.value || []);

            const headers: Record<string, string> = {};
            if (parsed.headers) {
              parsed.headers.forEach((value, key) => {
                if (typeof value === 'string') {
                  headers[key] = value;
                }
              });
            }

            messages.push({
              messageId:
                parsed.messageId || `${message.uid}@${config.host}`,
              from: {
                name: fromAddress.name || undefined,
                address: fromAddress.address || '',
              },
              to: toAddresses.map((a) => ({
                name: a.name || undefined,
                address: a.address || '',
              })),
              cc: ccAddresses.map((a) => ({
                name: a.name || undefined,
                address: a.address || '',
              })),
              subject: parsed.subject || '(no subject)',
              textBody: parsed.text || undefined,
              htmlBody: parsed.html || undefined,
              date: parsed.date || new Date(),
              inReplyTo: parsed.inReplyTo as string | undefined,
              references: Array.isArray(parsed.references)
                ? parsed.references
                : parsed.references
                  ? [parsed.references]
                  : [],
              attachments,
              headers,
              uid: message.uid,
              flags: Array.from(message.flags || []),
            });

            count++;
          } catch (parseError) {
            this.logger.warn(
              `Failed to parse message UID ${message.uid}: ${parseError.message}`,
            );
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (error) {
      this.logger.error(`IMAP fetch failed: ${error.message}`);
      throw error;
    }

    this.logger.log(
      `Fetched ${messages.length} messages from ${config.auth.user}/${folder}`,
    );
    return messages;
  }

  async fetchFolders(config: ImapConnectionConfig): Promise<string[]> {
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: this.buildAuth(config),
      logger: false,
      connectionTimeout: 15000,
    });

    try {
      await client.connect();
      const mailboxes = await client.list();
      await client.logout();
      return mailboxes.map((m) => m.path);
    } catch (error) {
      this.logger.error(`Failed to fetch folders: ${error.message}`);
      throw error;
    }
  }

  buildImapConfig(
    provider: EmailProvider,
    credentials: {
      user: string;
      password?: string;
      accessToken?: string;
    },
    customConfig?: { host: string; port: number; secure: boolean },
  ): ImapConnectionConfig {
    const defaults: Record<
      string,
      { host: string; port: number; secure: boolean }
    > = {
      gmail: { host: 'imap.gmail.com', port: 993, secure: true },
      mailru: { host: 'imap.mail.ru', port: 993, secure: true },
    };

    const config = customConfig || defaults[provider] || customConfig;

    if (!config) {
      throw new Error(
        `IMAP config required for provider "${provider}"`,
      );
    }

    return {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: credentials.user,
        pass: credentials.password,
        accessToken: credentials.accessToken,
      },
    };
  }
}
