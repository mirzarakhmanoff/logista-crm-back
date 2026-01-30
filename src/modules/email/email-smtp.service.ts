import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  SmtpConnectionConfig,
  EmailProvider,
} from './interfaces/email.interfaces';

@Injectable()
export class EmailSmtpService {
  private logger = new Logger('EmailSmtpService');

  async testConnection(config: SmtpConnectionConfig): Promise<boolean> {
    const transporter = this.createTransporter(config);
    try {
      await transporter.verify();
      this.logger.log(
        `SMTP connection test successful for ${config.auth.user}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `SMTP connection test failed for ${config.auth.user}: ${error.message}`,
      );
      return false;
    }
  }

  async sendMail(
    config: SmtpConnectionConfig,
    options: {
      from: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      text?: string;
      html?: string;
      inReplyTo?: string;
      references?: string[];
      attachments?: Array<{ filename: string; path: string }>;
    },
  ): Promise<{ messageId: string; accepted: string[] }> {
    const transporter = this.createTransporter(config);

    const mailOptions: nodemailer.SendMailOptions = {
      from: options.from,
      to: options.to.join(', '),
      cc: options.cc?.join(', '),
      bcc: options.bcc?.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html,
      inReplyTo: options.inReplyTo,
      references: options.references?.join(' '),
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        path: att.path,
      })),
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent via SMTP: ${options.subject} to ${options.to.join(', ')}`,
      );
      return {
        messageId: result.messageId,
        accepted: Array.isArray(result.accepted)
          ? result.accepted.map(String)
          : [],
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  buildSmtpConfig(
    provider: EmailProvider,
    credentials: {
      user: string;
      password?: string;
      accessToken?: string;
    },
    customConfig?: { host: string; port: number; secure: boolean },
  ): SmtpConnectionConfig {
    const defaults: Record<
      string,
      { host: string; port: number; secure: boolean }
    > = {
      gmail: { host: 'smtp.gmail.com', port: 465, secure: true },
      mailru: { host: 'smtp.mail.ru', port: 465, secure: true },
    };

    const config = customConfig || defaults[provider] || customConfig;

    if (!config) {
      throw new Error(
        `SMTP config required for provider "${provider}"`,
      );
    }

    const authConfig: SmtpConnectionConfig['auth'] = {
      user: credentials.user,
    };

    if (credentials.accessToken) {
      authConfig.type = 'OAuth2';
      authConfig.accessToken = credentials.accessToken;
    } else {
      authConfig.pass = credentials.password;
    }

    return {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: authConfig,
    };
  }

  private createTransporter(
    config: SmtpConnectionConfig,
  ): nodemailer.Transporter {
    const options: nodemailer.TransportOptions & Record<string, any> = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {} as Record<string, any>,
    };

    if (config.auth.type === 'OAuth2') {
      options.auth = {
        type: 'OAuth2',
        user: config.auth.user,
        accessToken: config.auth.accessToken,
      };
    } else {
      options.auth = {
        user: config.auth.user,
        pass: config.auth.pass,
      };
    }

    return nodemailer.createTransport(options);
  }
}
