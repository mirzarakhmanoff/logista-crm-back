import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  EmailAccount,
  EmailAccountSchema,
} from './schemas/email-account.schema';
import {
  EmailMessage,
  EmailMessageSchema,
} from './schemas/email-message.schema';
import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { EmailService } from './email.service';
import { EmailImapService } from './email-imap.service';
import { EmailSmtpService } from './email-smtp.service';
import { EmailOAuthService } from './email-oauth.service';
import { EmailSyncService } from './email-sync.service';
import { EmailController } from './email.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailAccount.name, schema: EmailAccountSchema },
      { name: EmailMessage.name, schema: EmailMessageSchema },
      { name: Client.name, schema: ClientSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/email-attachments',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `email-att-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB
      },
    }),
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailImapService,
    EmailSmtpService,
    EmailOAuthService,
    EmailSyncService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
