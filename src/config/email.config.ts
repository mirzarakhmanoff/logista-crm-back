import { ConfigService } from '@nestjs/config';

export interface EmailConfig {
  gmail: {
    user: string;
    appPassword: string;
    oauth: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };
  mailru: {
    user: string;
    password: string;
  };
  corporate: {
    host: string;
    user: string;
    password: string;
    imapPort: number;
    smtpPort: number;
  };
  sync: {
    intervalMs: number;
  };
  attachmentsPath: string;
}

export const getEmailConfig = (configService: ConfigService): EmailConfig => ({
  gmail: {
    user: configService.get<string>('GMAIL_USER', ''),
    appPassword: configService.get<string>('GMAIL_APP_PASSWORD', ''),
    oauth: {
      clientId: configService.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
      redirectUri: configService.get<string>(
        'GOOGLE_REDIRECT_URI',
        'http://localhost:3000/api/email/oauth/google/callback',
      ),
    },
  },
  mailru: {
    user: configService.get<string>('MAILRU_USER', ''),
    password: configService.get<string>('MAILRU_PASSWORD', ''),
  },
  corporate: {
    host: configService.get<string>('CORPORATE_EMAIL_HOST', ''),
    user: configService.get<string>('CORPORATE_EMAIL_USER', ''),
    password: configService.get<string>('CORPORATE_EMAIL_PASSWORD', ''),
    imapPort: configService.get<number>('CORPORATE_IMAP_PORT', 993),
    smtpPort: configService.get<number>('CORPORATE_SMTP_PORT', 465),
  },
  sync: {
    intervalMs: configService.get<number>('EMAIL_SYNC_INTERVAL', 60000),
  },
  attachmentsPath: configService.get<string>(
    'EMAIL_ATTACHMENTS_PATH',
    './uploads/email-attachments',
  ),
});
