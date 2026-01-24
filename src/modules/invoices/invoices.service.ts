import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceStatus } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { Request } from '../requests/schemas/request.schema';
import { SocketGateway } from '../../socket/socket.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Request.name) private requestModel: Model<Request>,
    private socketGateway: SocketGateway,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(createDto: CreateInvoiceDto, createdById: string): Promise<Invoice> {
    const request = await this.requestModel.findById(createDto.requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${createDto.requestId} not found`);
    }

    const invoice = new this.invoiceModel({
      ...createDto,
      createdBy: createdById,
      issuedAt: createDto.issuedAt || new Date(),
    });

    const savedInvoice = await invoice.save();

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: createDto.requestId,
      action: 'updated',
      message: `Invoice created: ${createDto.number}`,
      userId: createdById,
    });

    this.socketGateway.emitToAll('invoiceCreated', savedInvoice);

    return savedInvoice;
  }

  async findByRequest(requestId: string): Promise<Invoice[]> {
    return this.invoiceModel
      .find({ requestId: new Types.ObjectId(requestId) })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceModel
      .findById(id)
      .populate('requestId')
      .populate('createdBy', 'fullName email')
      .exec();

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async update(id: string, updateDto: UpdateInvoiceDto, userId: string): Promise<Invoice> {
    const invoice = await this.invoiceModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .populate('createdBy', 'fullName email')
      .exec();

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: invoice.requestId.toString(),
      action: 'updated',
      message: `Invoice ${invoice.number} updated`,
      userId,
    });

    this.socketGateway.emitToAll('invoiceUpdated', invoice);

    return invoice;
  }

  async pay(id: string, payDto: PayInvoiceDto, userId: string): Promise<Invoice> {
    const invoice = await this.invoiceModel.findById(id).exec();
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay cancelled invoice');
    }

    const newPaidAmount = invoice.paidAmount + payDto.amount;

    if (newPaidAmount > invoice.amount) {
      throw new BadRequestException('Payment amount exceeds remaining balance');
    }

    invoice.paidAmount = newPaidAmount;

    if (newPaidAmount >= invoice.amount) {
      invoice.status = InvoiceStatus.PAID;
      invoice.paidAt = new Date();
    } else if (newPaidAmount > 0) {
      invoice.status = InvoiceStatus.PARTIAL;
    }

    await invoice.save();

    const populatedInvoice = await this.findOne(id);

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: invoice.requestId.toString(),
      action: 'updated',
      message: `Payment of ${payDto.amount} ${invoice.currency} received for invoice ${invoice.number}`,
      userId,
    });

    this.socketGateway.emitToAll('invoicePaid', populatedInvoice);

    return populatedInvoice;
  }

  async getUnpaid(): Promise<Invoice[]> {
    return this.invoiceModel
      .find({ status: { $in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] } })
      .populate('requestId')
      .populate('createdBy', 'fullName email')
      .sort({ dueDate: 1 })
      .exec();
  }

  async remove(id: string): Promise<void> {
    const result = await this.invoiceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    this.socketGateway.emitToAll('invoiceDeleted', { invoiceId: id });
  }
}
