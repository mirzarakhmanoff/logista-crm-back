import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Client, ClientSchema } from './schemas/client.schema';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { RequestsModule } from '../requests/requests.module';
import { Request, RequestSchema } from '../requests/schemas/request.schema';
import { Document, DocumentSchema } from '../documents/schemas/document.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Shipment, ShipmentSchema } from '../shipments/schemas/shipment.schema';
import { RateQuote, RateQuoteSchema } from '../rate-quotes/schemas/rate-quote.schema';
import { IssuedCode, IssuedCodeSchema } from '../issued-codes/schemas/issued-code.schema';
import { ActivityLog, ActivityLogSchema } from '../activity-logs/schemas/activity-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: Request.name, schema: RequestSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Shipment.name, schema: ShipmentSchema },
      { name: RateQuote.name, schema: RateQuoteSchema },
      { name: IssuedCode.name, schema: IssuedCodeSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/clients',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new Error('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
    forwardRef(() => RequestsModule),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService, MongooseModule],
})
export class ClientsModule {}
