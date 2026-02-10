import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OperationalPayment } from './schemas/operational-payment.schema';
import { CreateOperationalPaymentDto } from './dto/create-operational-payment.dto';
import { UpdateOperationalPaymentDto } from './dto/update-operational-payment.dto';
import { FilterOperationalPaymentDto } from './dto/filter-operational-payment.dto';
import { PaymentStatus } from './enums/payment-status.enum';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SocketGateway } from '../../socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class OperationalPaymentsService {
  constructor(
    @InjectModel(OperationalPayment.name)
    private operationalPaymentModel: Model<OperationalPayment>,
    private activityLogsService: ActivityLogsService,
    private socketGateway: SocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createDto: CreateOperationalPaymentDto,
    files: Array<Express.Multer.File>,
    createdById: string,
  ): Promise<OperationalPayment> {
    // Generate payment number
    const paymentNumber = await this.generatePaymentNumber();

    // Prepare files data
    const filesData = files.map((file) => ({
      filename: file.originalname,
      fileId: file.filename,
      path: file.path,
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(createdById),
    }));

    const payment = new this.operationalPaymentModel({
      ...createDto,
      paymentNumber,
      status: PaymentStatus.DRAFT,
      createdBy: new Types.ObjectId(createdById),
      currency: createDto.currency || 'RUB',
      files: filesData,
    });

    const saved = await payment.save();

    // Log activity
    await this.activityLogsService.log({
      entityType: 'OPERATIONAL_PAYMENT',
      entityId: saved._id.toString(),
      action: 'created',
      message: `Операционный платеж ${saved.paymentNumber} создан${files.length > 0 ? ` с ${files.length} файлами` : ''}`,
      userId: createdById,
    });

    // Emit socket event
    this.socketGateway.emitToAll('paymentCreated', saved);

    this.notificationsService.create({
      type: NotificationType.PAYMENT_CREATED,
      title: 'Yangi to\'lov',
      message: `Yangi operatsion to'lov yaratildi: ${saved.paymentNumber}`,
      entityType: 'OPERATIONAL_PAYMENT',
      entityId: saved._id.toString(),
      createdBy: createdById,
    });

    return this.findOne(saved._id.toString());
  }

  async findAll(filterDto: FilterOperationalPaymentDto): Promise<any> {
    const {
      status,
      category,
      isCritical,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 25,
    } = filterDto;

    const query: any = { isArchived: { $ne: true } };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.counterpartyCategory = category;
    }

    if (isCritical !== undefined) {
      query.isCritical = isCritical;
    }

    if (search) {
      query.$or = [
        { paymentNumber: { $regex: search, $options: 'i' } },
        { counterpartyName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.operationalPaymentModel
        .find(query)
        .populate('createdBy', 'fullName email')
        .populate('approvedBy', 'fullName email')
        .populate('rejectedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.operationalPaymentModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<OperationalPayment> {
    const payment = await this.operationalPaymentModel
      .findById(id)
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .populate('rejectedBy', 'fullName email')
      .populate('archivedBy', 'fullName email')
      .exec();

    if (!payment) {
      throw new NotFoundException(
        `Операционный платеж с ID ${id} не найден`,
      );
    }

    return payment;
  }

  async update(
    id: string,
    updateDto: UpdateOperationalPaymentDto,
    files: Array<Express.Multer.File>,
    userId: string,
  ): Promise<OperationalPayment> {
    const payment = await this.findOne(id);

    const updateData: any = { ...updateDto };

    // Handle status change metadata
    if (updateDto.status) {
      switch (updateDto.status) {
        case PaymentStatus.APPROVED:
          updateData.approvedBy = new Types.ObjectId(userId);
          updateData.approvedAt = new Date();
          break;
        case PaymentStatus.REJECTED:
          updateData.rejectedBy = new Types.ObjectId(userId);
          updateData.rejectedAt = new Date();
          break;
        case PaymentStatus.PAID:
          updateData.paidAt = updateDto.paidAt ? new Date(updateDto.paidAt) : new Date();
          break;
      }
    }

    // Add new files to existing ones
    if (files && files.length > 0) {
      const newFiles = files.map((file) => ({
        filename: file.originalname,
        fileId: file.filename,
        path: file.path,
        uploadedAt: new Date(),
        uploadedBy: new Types.ObjectId(userId),
      }));

      updateData.$push = { files: { $each: newFiles } };
    }

    const updated = await this.operationalPaymentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .populate('rejectedBy', 'fullName email')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Операционный платеж с ID ${id} не найден`);
    }

    // Log activity
    await this.activityLogsService.log({
      entityType: 'OPERATIONAL_PAYMENT',
      entityId: id,
      action: 'updated',
      message: `Операционный платеж ${payment.paymentNumber} обновлен${updateDto.status ? ` (статус: ${updateDto.status})` : ''}${files.length > 0 ? ` (добавлено ${files.length} файлов)` : ''}`,
      userId,
    });

    // Emit socket event
    this.socketGateway.emitToAll('paymentUpdated', updated);

    if (updateDto.status) {
      this.notificationsService.create({
        type: NotificationType.PAYMENT_STATUS_CHANGED,
        title: 'To\'lov statusi o\'zgardi',
        message: `To'lov ${payment.paymentNumber} statusi ${updateDto.status} ga o'zgardi`,
        entityType: 'OPERATIONAL_PAYMENT',
        entityId: id,
        createdBy: userId,
      });
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const payment = await this.findOne(id);

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Нельзя удалить оплаченный платеж');
    }

    await this.operationalPaymentModel.findByIdAndDelete(id).exec();

    // Log activity
    await this.activityLogsService.log({
      entityType: 'OPERATIONAL_PAYMENT',
      entityId: id,
      action: 'deleted',
      message: `Операционный платеж ${payment.paymentNumber} удален`,
      userId,
    });

    // Emit socket event
    this.socketGateway.emitToAll('paymentDeleted', { id });
  }

  async getStatistics(): Promise<any> {
    const totalBudget = 10000000; // RUB - can be moved to config

    const [
      totalPayments,
      criticalPayments,
      pendingPayments,
      approvedAmount,
      paidAmount,
    ] = await Promise.all([
      this.operationalPaymentModel.countDocuments({ isArchived: { $ne: true } }),
      this.operationalPaymentModel.countDocuments({
        isCritical: true,
        status: { $ne: PaymentStatus.PAID },
        isArchived: { $ne: true },
      }),
      this.operationalPaymentModel.countDocuments({
        status: PaymentStatus.PENDING_APPROVAL,
        isArchived: { $ne: true },
      }),
      this.operationalPaymentModel.aggregate([
        {
          $match: {
            status: { $in: [PaymentStatus.APPROVED, PaymentStatus.PAID] },
            isArchived: { $ne: true },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.operationalPaymentModel.aggregate([
        {
          $match: {
            status: PaymentStatus.PAID,
            isArchived: { $ne: true },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const approvedSum = approvedAmount[0]?.total || 0;
    const paidSum = paidAmount[0]?.total || 0;
    const availableLimit = ((totalBudget - approvedSum) / totalBudget) * 100;

    return {
      total: totalPayments,
      critical: criticalPayments,
      pending: pendingPayments,
      availableLimit: Math.max(0, availableLimit).toFixed(1),
      totalBudget,
      approvedSum,
      paidSum,
      remainingBudget: totalBudget - approvedSum,
    };
  }

  private async generatePaymentNumber(): Promise<string> {
    const lastPayment = await this.operationalPaymentModel
      .findOne()
      .sort({ createdAt: -1 })
      .exec();

    let nextNumber = 1;
    if (lastPayment && lastPayment.paymentNumber) {
      const lastNumber = parseInt(lastPayment.paymentNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }

    return `KPK-${nextNumber.toString().padStart(4, '0')}`;
  }

  async uploadFile(
    id: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<OperationalPayment> {
    const payment = await this.findOne(id);

    const fileData = {
      filename: file.filename,
      fileId: file.filename,
      path: file.path,
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(userId),
    };

    payment.files.push(fileData);
    await payment.save();

    // Log activity
    await this.activityLogsService.log({
      entityType: 'OPERATIONAL_PAYMENT',
      entityId: id,
      action: 'file_uploaded',
      message: `Файл ${file.filename} загружен к платежу ${payment.paymentNumber}`,
      userId,
    });

    return this.findOne(id);
  }

  async deleteFile(
    id: string,
    fileId: string,
    userId: string,
  ): Promise<OperationalPayment> {
    const payment = await this.findOne(id);

    const fileIndex = payment.files.findIndex((f) => f.fileId === fileId);
    if (fileIndex === -1) {
      throw new NotFoundException('Файл не найден');
    }

    payment.files.splice(fileIndex, 1);
    await payment.save();

    // Log activity
    await this.activityLogsService.log({
      entityType: 'OPERATIONAL_PAYMENT',
      entityId: id,
      action: 'file_deleted',
      message: `Файл удален из платежа ${payment.paymentNumber}`,
      userId,
    });

    return this.findOne(id);
  }
}
