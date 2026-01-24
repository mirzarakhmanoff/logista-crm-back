import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Request, RequestSchema } from '../requests/schemas/request.schema';
import { IssuedCode, IssuedCodeSchema } from '../issued-codes/schemas/issued-code.schema';
import { Shipment, ShipmentSchema } from '../shipments/schemas/shipment.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Request.name, schema: RequestSchema },
      { name: IssuedCode.name, schema: IssuedCodeSchema },
      { name: Shipment.name, schema: ShipmentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
