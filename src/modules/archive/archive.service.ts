import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Client } from '../clients/schemas/client.schema';
import { Request } from '../requests/schemas/request.schema';
import { Document } from '../documents/schemas/document.schema';
import { Invoice } from '../invoices/schemas/invoice.schema';
import { Shipment } from '../shipments/schemas/shipment.schema';
import { RateQuote } from '../rate-quotes/schemas/rate-quote.schema';
import { IssuedCode } from '../issued-codes/schemas/issued-code.schema';
import { ArchiveQueryDto, ArchiveCategory, ArchiveItemDto } from './dto/archive-query.dto';

@Injectable()
export class ArchiveService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectModel(Request.name) private requestModel: Model<Request>,
    @InjectModel(Document.name) private documentModel: Model<Document>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(RateQuote.name) private rateQuoteModel: Model<RateQuote>,
    @InjectModel(IssuedCode.name) private issuedCodeModel: Model<IssuedCode>,
  ) {}

  private getModelByCategory(category: ArchiveCategory): Model<any> | null {
    const modelMap: Record<string, Model<any>> = {
      [ArchiveCategory.CLIENTS]: this.clientModel,
      [ArchiveCategory.REQUESTS]: this.requestModel,
      [ArchiveCategory.DOCUMENTS]: this.documentModel,
      [ArchiveCategory.INVOICES]: this.invoiceModel,
      [ArchiveCategory.SHIPMENTS]: this.shipmentModel,
      [ArchiveCategory.RATE_QUOTES]: this.rateQuoteModel,
      [ArchiveCategory.ISSUED_CODES]: this.issuedCodeModel,
    };
    return modelMap[category] || null;
  }

  private buildDateFilter(startDate?: string, endDate?: string): any {
    const filter: any = {};
    if (startDate || endDate) {
      filter.archivedAt = {};
      if (startDate) {
        filter.archivedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.archivedAt.$lte = end;
      }
    }
    return filter;
  }

  private formatItem(item: any, category: ArchiveCategory): ArchiveItemDto {
    let title = '';
    let description = '';
    const metadata: Record<string, any> = {};

    switch (category) {
      case ArchiveCategory.CLIENTS:
        title = item.name || 'Unnamed Client';
        description = item.company || '';
        metadata.type = item.type;
        metadata.phone = item.phone;
        metadata.email = item.email;
        metadata.clientNumber = item.clientNumber;
        break;

      case ArchiveCategory.REQUESTS:
        title = item.cargoName || `Request #${item._id}`;
        description = item.route || '';
        metadata.type = item.type;
        metadata.statusKey = item.statusKey;
        metadata.source = item.source;
        metadata.client = item.client;
        break;

      case ArchiveCategory.DOCUMENTS:
        title = item.title || item.documentNumber;
        description = item.description || '';
        metadata.documentNumber = item.documentNumber;
        metadata.status = item.status;
        metadata.type = item.type;
        metadata.priority = item.priority;
        break;

      case ArchiveCategory.INVOICES:
        title = `Invoice #${item.number}`;
        description = `Amount: ${item.amount} ${item.currency}`;
        metadata.amount = item.amount;
        metadata.currency = item.currency;
        metadata.status = item.status;
        metadata.paidAmount = item.paidAmount;
        break;

      case ArchiveCategory.SHIPMENTS:
        title = item.shipmentNo || `Shipment #${item._id}`;
        description = `${item.fromCity || ''} → ${item.toCity || ''}`;
        metadata.status = item.status;
        metadata.carrier = item.carrier;
        metadata.vehicleNo = item.vehicleNo;
        break;

      case ArchiveCategory.RATE_QUOTES:
        title = `Quote: ${item.fromCity} → ${item.toCity}`;
        description = item.cargoName || '';
        metadata.cost = item.cost;
        metadata.currency = item.currency;
        metadata.status = item.status;
        break;

      case ArchiveCategory.ISSUED_CODES:
        title = `Code: ${item.code}`;
        description = item.notes || '';
        metadata.codeType = item.codeType;
        metadata.status = item.status;
        break;
    }

    return {
      id: item._id.toString(),
      category,
      title,
      description,
      archivedAt: item.archivedAt,
      archivedBy: item.archivedBy?.toString(),
      createdAt: item.createdAt,
      metadata,
    };
  }

  async getArchivedItems(query: ArchiveQueryDto, companyId: string): Promise<{
    items: ArchiveItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    categories: Record<string, number>;
  }> {
    const category = query.category || ArchiveCategory.ALL;
    const startDate = query.startDate;
    const endDate = query.endDate;
    const search = query.search;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'archivedAt';
    const sortOrder = query.sortOrder || 'desc';
    const skip = (page - 1) * limit;
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const baseFilter: any = {
      isArchived: true,
      companyId: companyId,
      ...dateFilter,
    };

    let allItems: ArchiveItemDto[] = [];
    const categoryCounts: Record<string, number> = {};

    const categoriesToFetch =
      category === ArchiveCategory.ALL
        ? [
            ArchiveCategory.CLIENTS,
            ArchiveCategory.REQUESTS,
            ArchiveCategory.DOCUMENTS,
            ArchiveCategory.INVOICES,
            ArchiveCategory.SHIPMENTS,
            ArchiveCategory.RATE_QUOTES,
            ArchiveCategory.ISSUED_CODES,
          ]
        : [category];

    for (const cat of categoriesToFetch) {
      const model = this.getModelByCategory(cat);
      if (!model) continue;

      const filter = { ...baseFilter };

      // Add search filter based on category
      if (search) {
        switch (cat) {
          case ArchiveCategory.CLIENTS:
            filter.$or = [
              { name: { $regex: search, $options: 'i' } },
              { company: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
            ];
            break;
          case ArchiveCategory.REQUESTS:
            filter.$or = [
              { cargoName: { $regex: search, $options: 'i' } },
              { route: { $regex: search, $options: 'i' } },
              { client: { $regex: search, $options: 'i' } },
            ];
            break;
          case ArchiveCategory.DOCUMENTS:
            filter.$or = [
              { title: { $regex: search, $options: 'i' } },
              { documentNumber: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
            ];
            break;
          case ArchiveCategory.INVOICES:
            filter.$or = [{ number: { $regex: search, $options: 'i' } }];
            break;
          case ArchiveCategory.SHIPMENTS:
            filter.$or = [
              { shipmentNo: { $regex: search, $options: 'i' } },
              { fromCity: { $regex: search, $options: 'i' } },
              { toCity: { $regex: search, $options: 'i' } },
            ];
            break;
          case ArchiveCategory.RATE_QUOTES:
            filter.$or = [
              { fromCity: { $regex: search, $options: 'i' } },
              { toCity: { $regex: search, $options: 'i' } },
              { cargoName: { $regex: search, $options: 'i' } },
            ];
            break;
          case ArchiveCategory.ISSUED_CODES:
            filter.$or = [
              { code: { $regex: search, $options: 'i' } },
              { notes: { $regex: search, $options: 'i' } },
            ];
            break;
        }
      }

      const count = await model.countDocuments(filter);
      categoryCounts[cat] = count;

      if (category === ArchiveCategory.ALL || category === cat) {
        const items = await model.find(filter).lean();
        const formattedItems = items.map((item) => this.formatItem(item, cat));
        allItems.push(...formattedItems);
      }
    }

    // Sort all items
    allItems.sort((a, b) => {
      const aValue = a[sortBy] || a.archivedAt;
      const bValue = b[sortBy] || b.archivedAt;
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    const total = allItems.length;
    const paginatedItems = allItems.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categories: categoryCounts,
    };
  }

  async archiveItem(
    category: ArchiveCategory,
    id: string,
    userId: string,
  ): Promise<any> {
    if (category === ArchiveCategory.ALL) {
      throw new BadRequestException('Cannot archive with category "all"');
    }

    const model = this.getModelByCategory(category);
    if (!model) {
      throw new BadRequestException(`Invalid category: ${category}`);
    }

    const item = await model.findById(id);
    if (!item) {
      throw new NotFoundException(`Item not found in ${category}`);
    }

    if (item.isArchived) {
      throw new BadRequestException('Item is already archived');
    }

    item.isArchived = true;
    item.archivedAt = new Date();
    item.archivedBy = new Types.ObjectId(userId);
    await item.save();

    return {
      success: true,
      message: `Item archived successfully`,
      item: this.formatItem(item.toObject(), category),
    };
  }

  async restoreItem(
    category: ArchiveCategory,
    id: string,
  ): Promise<any> {
    if (category === ArchiveCategory.ALL) {
      throw new BadRequestException('Cannot restore with category "all"');
    }

    const model = this.getModelByCategory(category);
    if (!model) {
      throw new BadRequestException(`Invalid category: ${category}`);
    }

    const item = await model.findById(id);
    if (!item) {
      throw new NotFoundException(`Item not found in ${category}`);
    }

    if (!item.isArchived) {
      throw new BadRequestException('Item is not archived');
    }

    item.isArchived = false;
    item.archivedAt = undefined;
    item.archivedBy = undefined;
    await item.save();

    return {
      success: true,
      message: `Item restored successfully`,
      category,
      id,
    };
  }

  async bulkArchive(
    category: ArchiveCategory,
    ids: string[],
    userId: string,
  ): Promise<any> {
    if (category === ArchiveCategory.ALL) {
      throw new BadRequestException('Cannot bulk archive with category "all"');
    }

    const model = this.getModelByCategory(category);
    if (!model) {
      throw new BadRequestException(`Invalid category: ${category}`);
    }

    const result = await model.updateMany(
      {
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        isArchived: false,
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: new Types.ObjectId(userId),
        },
      },
    );

    return {
      success: true,
      message: `${result.modifiedCount} items archived successfully`,
      archivedCount: result.modifiedCount,
    };
  }

  async bulkRestore(
    category: ArchiveCategory,
    ids: string[],
  ): Promise<any> {
    if (category === ArchiveCategory.ALL) {
      throw new BadRequestException('Cannot bulk restore with category "all"');
    }

    const model = this.getModelByCategory(category);
    if (!model) {
      throw new BadRequestException(`Invalid category: ${category}`);
    }

    const result = await model.updateMany(
      {
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        isArchived: true,
      },
      {
        $set: { isArchived: false },
        $unset: { archivedAt: '', archivedBy: '' },
      },
    );

    return {
      success: true,
      message: `${result.modifiedCount} items restored successfully`,
      restoredCount: result.modifiedCount,
    };
  }

  async permanentDelete(
    category: ArchiveCategory,
    id: string,
  ): Promise<any> {
    if (category === ArchiveCategory.ALL) {
      throw new BadRequestException('Cannot delete with category "all"');
    }

    const model = this.getModelByCategory(category);
    if (!model) {
      throw new BadRequestException(`Invalid category: ${category}`);
    }

    const item = await model.findOne({ _id: id, isArchived: true });
    if (!item) {
      throw new NotFoundException(`Archived item not found in ${category}`);
    }

    await model.deleteOne({ _id: id });

    return {
      success: true,
      message: `Item permanently deleted`,
      category,
      id,
    };
  }

  async getArchiveStats(companyId: string): Promise<any> {
    const cid = companyId;
    const [
      clientsCount,
      requestsCount,
      documentsCount,
      invoicesCount,
      shipmentsCount,
      rateQuotesCount,
      issuedCodesCount,
    ] = await Promise.all([
      this.clientModel.countDocuments({ isArchived: true, companyId: cid }),
      this.requestModel.countDocuments({ isArchived: true, companyId: cid }),
      this.documentModel.countDocuments({ isArchived: true, companyId: cid }),
      this.invoiceModel.countDocuments({ isArchived: true, companyId: cid }),
      this.shipmentModel.countDocuments({ isArchived: true, companyId: cid }),
      this.rateQuoteModel.countDocuments({ isArchived: true, companyId: cid }),
      this.issuedCodeModel.countDocuments({ isArchived: true, companyId: cid }),
    ]);

    const total =
      clientsCount +
      requestsCount +
      documentsCount +
      invoicesCount +
      shipmentsCount +
      rateQuotesCount +
      issuedCodesCount;

    return {
      total,
      byCategory: {
        [ArchiveCategory.CLIENTS]: clientsCount,
        [ArchiveCategory.REQUESTS]: requestsCount,
        [ArchiveCategory.DOCUMENTS]: documentsCount,
        [ArchiveCategory.INVOICES]: invoicesCount,
        [ArchiveCategory.SHIPMENTS]: shipmentsCount,
        [ArchiveCategory.RATE_QUOTES]: rateQuotesCount,
        [ArchiveCategory.ISSUED_CODES]: issuedCodesCount,
      },
    };
  }

  async getArchivedItemById(
    category: ArchiveCategory,
    id: string,
  ): Promise<ArchiveItemDto> {
    if (category === ArchiveCategory.ALL) {
      throw new BadRequestException('Must specify a category');
    }

    const model = this.getModelByCategory(category);
    if (!model) {
      throw new BadRequestException(`Invalid category: ${category}`);
    }

    const item = await model
      .findOne({ _id: id, isArchived: true })
      .populate('archivedBy', 'fullName email')
      .lean();

    if (!item) {
      throw new NotFoundException(`Archived item not found`);
    }

    return this.formatItem(item, category);
  }
}
