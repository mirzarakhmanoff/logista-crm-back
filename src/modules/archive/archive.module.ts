import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';
import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { Request, RequestSchema } from '../requests/schemas/request.schema';
import { Document, DocumentSchema } from '../documents/schemas/document.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Shipment, ShipmentSchema } from '../shipments/schemas/shipment.schema';
import { RateQuote, RateQuoteSchema } from '../rate-quotes/schemas/rate-quote.schema';
import { IssuedCode, IssuedCodeSchema } from '../issued-codes/schemas/issued-code.schema';

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
    ]),
  ],
  controllers: [ArchiveController],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}
