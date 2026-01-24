import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from '../requests/schemas/request.schema';
import { IssuedCode, CodeStatus } from '../issued-codes/schemas/issued-code.schema';
import { Shipment, ShipmentStatus } from '../shipments/schemas/shipment.schema';
import { Invoice, InvoiceStatus } from '../invoices/schemas/invoice.schema';
import { RequestType } from '../request-statuses/schemas/request-status.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Request.name) private requestModel: Model<Request>,
    @InjectModel(IssuedCode.name) private issuedCodeModel: Model<IssuedCode>,
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
  ) {}

  async getSummary(): Promise<any> {
    const [
      newClientsCount,
      ourClientsCount,
      inWorkCount,
      activeCodesCount,
      shipmentsInTransitCount,
      unpaidInvoicesCount,
    ] = await Promise.all([
      this.requestModel.countDocuments({ type: RequestType.NEW_CLIENT }),
      this.requestModel.countDocuments({ type: RequestType.OUR_CLIENT }),
      this.requestModel.countDocuments({ statusKey: 'in_work' }),
      this.issuedCodeModel.countDocuments({ status: CodeStatus.ACTIVE }),
      this.shipmentModel.countDocuments({ status: ShipmentStatus.IN_TRANSIT }),
      this.invoiceModel.countDocuments({
        status: { $in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
      }),
    ]);

    return {
      newClients: newClientsCount,
      ourClients: ourClientsCount,
      inWork: inWorkCount,
      activeCodes: activeCodesCount,
      shipmentsInTransit: shipmentsInTransitCount,
      unpaidInvoices: unpaidInvoicesCount,
    };
  }

  async getRequestStats(): Promise<any> {
    const newClientStats = await this.requestModel.aggregate([
      { $match: { type: RequestType.NEW_CLIENT } },
      { $group: { _id: '$statusKey', count: { $sum: 1 } } },
    ]);

    const ourClientStats = await this.requestModel.aggregate([
      { $match: { type: RequestType.OUR_CLIENT } },
      { $group: { _id: '$statusKey', count: { $sum: 1 } } },
    ]);

    return {
      newClient: newClientStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      ourClient: ourClientStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}
