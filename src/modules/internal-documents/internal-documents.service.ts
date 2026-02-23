import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import { DocumentCategory } from './schemas/document-category.schema';
import {
  InternalDocument,
  InternalDocumentStatus,
} from './schemas/internal-document.schema';
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto';
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto';
import { CreateInternalDocumentDto } from './dto/create-internal-document.dto';
import { UpdateInternalDocumentDto } from './dto/update-internal-document.dto';
import { FilterInternalDocumentDto } from './dto/filter-internal-document.dto';
import { UpdateInternalDocumentStatusDto } from './dto/update-internal-document-status.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SocketGateway } from '../../socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class InternalDocumentsService {
  constructor(
    @InjectModel(DocumentCategory.name)
    private categoryModel: Model<DocumentCategory>,
    @InjectModel(InternalDocument.name)
    private documentModel: Model<InternalDocument>,
    private activityLogsService: ActivityLogsService,
    private socketGateway: SocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== CATEGORIES ====================

  async createCategory(
    dto: CreateDocumentCategoryDto,
    userId: string,
    companyId: string,
  ): Promise<DocumentCategory> {
    const category = new this.categoryModel({
      ...dto,
      createdBy: userId,
      companyId,
    });
    return category.save();
  }

  async findAllCategories(companyId: string): Promise<any[]> {
    const categories = await this.categoryModel
      .find({ isArchived: false, companyId: new Types.ObjectId(companyId) })
      .populate('createdBy', 'fullName avatar email')
      .sort({ createdAt: 1 })
      .exec();

    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const fileCount = await this.documentModel.countDocuments({
          category: cat._id,
          isArchived: false,
        });
        return {
          ...cat.toObject(),
          fileCount,
        };
      }),
    );

    return categoriesWithCounts;
  }

  async findCategoryById(id: string): Promise<DocumentCategory> {
    const category = await this.categoryModel
      .findById(id)
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async updateCategory(
    id: string,
    dto: UpdateDocumentCategoryDto,
  ): Promise<DocumentCategory> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async removeCategory(id: string): Promise<void> {
    const docCount = await this.documentModel.countDocuments({ category: id });
    if (docCount > 0) {
      await this.categoryModel.findByIdAndUpdate(id, { isArchived: true });
      return;
    }

    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }

  // ==================== GLOBAL STATS ====================

  async getGlobalStats(): Promise<{
    total: number;
    underReview: number;
    overdue: number;
  }> {
    const [total, underReview, overdue] = await Promise.all([
      this.documentModel.countDocuments({ isArchived: false }),
      this.documentModel.countDocuments({
        status: InternalDocumentStatus.UNDER_REVIEW,
        isArchived: false,
      }),
      this.getOverdueCount(),
    ]);

    return { total, underReview, overdue };
  }

  private async getOverdueCount(): Promise<number> {
    return this.documentModel.countDocuments({
      dueDate: { $lt: new Date() },
      status: {
        $nin: [
          InternalDocumentStatus.COMPLETED,
          InternalDocumentStatus.ARCHIVED,
        ],
      },
      isArchived: false,
    });
  }

  // ==================== DOCUMENTS ====================

  async createDocument(
    dto: CreateInternalDocumentDto,
    userId: string,
    companyId: string,
  ): Promise<InternalDocument> {
    let savedDocument!: InternalDocument;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const document = new this.documentModel({
          ...dto,
          createdBy: userId,
          companyId: new Types.ObjectId(companyId),
        });
        savedDocument = await document.save();
        break;
      } catch (error: any) {
        if (error.code === 11000 && attempt < maxRetries - 1) {
          continue;
        }
        throw error;
      }
    }

    const populated = await this.documentModel
      .findById(savedDocument._id)
      .populate('category')
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!populated) {
      throw new NotFoundException('Failed to create document');
    }

    await this.activityLogsService.log({
      entityType: 'INTERNAL_DOCUMENT',
      entityId: populated._id.toString(),
      action: 'created',
      message: `Internal document created: ${populated.documentNumber}`,
      userId,
    });

    this.socketGateway.emitToCompany(companyId, 'internalDocumentCreated', populated);

    this.notificationsService.create({
      type: NotificationType.INTERNAL_DOC_CREATED,
      title: 'Новый внутренний документ',
      message: `Создан новый внутренний документ: ${populated.documentNumber}`,
      entityType: 'INTERNAL_DOCUMENT',
      entityId: populated._id.toString(),
      createdBy: userId,
    });

    return populated;
  }

  async findAllDocuments(
    filterDto: FilterInternalDocumentDto,
    companyId: string,
  ): Promise<InternalDocument[]> {
    const query: any = { companyId: new Types.ObjectId(companyId) };

    if (filterDto.isArchived !== undefined) {
      query.isArchived = filterDto.isArchived;
    } else if (filterDto.status === InternalDocumentStatus.ARCHIVED) {
      query.isArchived = true;
    } else {
      query.isArchived = false;
    }

    if (filterDto.category) query.category = filterDto.category;
    if (filterDto.status) query.status = filterDto.status;
    if (filterDto.type) query.type = filterDto.type;
    if (filterDto.counterparty) {
      query.counterparty = { $regex: filterDto.counterparty, $options: 'i' };
    }
    if (filterDto.assignedTo) query.assignedTo = filterDto.assignedTo;

    if (filterDto.search) {
      query.$or = [
        { title: { $regex: filterDto.search, $options: 'i' } },
        { counterparty: { $regex: filterDto.search, $options: 'i' } },
        { documentNumber: { $regex: filterDto.search, $options: 'i' } },
        { description: { $regex: filterDto.search, $options: 'i' } },
      ];
    }

    return this.documentModel
      .find(query)
      .populate('category')
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .populate('files.uploadedBy', 'fullName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findDocumentById(id: string): Promise<InternalDocument> {
    const document = await this.documentModel
      .findById(id)
      .populate('category')
      .populate('assignedTo', 'fullName avatar email phone')
      .populate('createdBy', 'fullName avatar email phone')
      .populate('files.uploadedBy', 'fullName avatar')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async updateDocument(
    id: string,
    dto: UpdateInternalDocumentDto,
    userId: string,
  ): Promise<InternalDocument> {
    const document = await this.documentModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('category')
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'INTERNAL_DOCUMENT',
      entityId: id,
      action: 'updated',
      message: 'Internal document updated',
      userId,
    });

    this.socketGateway.emitToCompany(document.companyId?.toString(), 'internalDocumentUpdated', document);

    this.notificationsService.create({
      type: NotificationType.INTERNAL_DOC_UPDATED,
      title: 'Внутренний документ обновлён',
      message: `Внутренний документ обновлён: ${document.documentNumber}`,
      entityType: 'INTERNAL_DOCUMENT',
      entityId: id,
      createdBy: userId,
    });

    return document;
  }

  async updateDocumentStatus(
    id: string,
    dto: UpdateInternalDocumentStatusDto,
    userId: string,
  ): Promise<InternalDocument> {
    const document = await this.findDocumentById(id);
    const oldStatus = document.status;

    const updateData: any = { status: dto.status };

    if (dto.status === InternalDocumentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }
    if (dto.status === InternalDocumentStatus.ARCHIVED) {
      updateData.isArchived = true;
      updateData.archivedAt = new Date();
      updateData.archivedBy = userId;
    } else {
      updateData.isArchived = false;
      updateData.archivedAt = null;
      updateData.archivedBy = null;
    }

    const updated = await this.documentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('category')
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'INTERNAL_DOCUMENT',
      entityId: id,
      action: 'status_changed',
      message: `Status changed from ${oldStatus} to ${dto.status}`,
      userId,
    });

    this.socketGateway.emitToCompany(updated.companyId?.toString(), 'internalDocumentStatusChanged', {
      documentId: id,
      oldStatus,
      newStatus: dto.status,
      document: updated,
    });

    return updated;
  }

  async removeDocument(id: string): Promise<void> {
    const document = await this.documentModel.findById(id).exec();
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    const companyId = document.companyId?.toString();
    await this.documentModel.findByIdAndDelete(id).exec();

    this.socketGateway.emitToCompany(companyId, 'internalDocumentDeleted', {
      documentId: id,
    });
  }

  // ==================== CATEGORY STATS ====================

  async getCategoryStats(
    categoryId: string,
  ): Promise<{ total: number; signing: number; expiring: number }> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [total, signing, expiring] = await Promise.all([
      this.documentModel.countDocuments({
        category: categoryId,
        isArchived: false,
      }),
      this.documentModel.countDocuments({
        category: categoryId,
        status: InternalDocumentStatus.SIGNING,
        isArchived: false,
      }),
      this.documentModel.countDocuments({
        category: categoryId,
        dueDate: { $lte: thirtyDaysFromNow, $gte: new Date() },
        status: {
          $nin: [
            InternalDocumentStatus.COMPLETED,
            InternalDocumentStatus.ARCHIVED,
          ],
        },
        isArchived: false,
      }),
    ]);

    return { total, signing, expiring };
  }

  async getDocumentStatsByStatus(categoryId?: string) {
    const match: any = { isArchived: false };
    if (categoryId) match.category = categoryId;

    return this.documentModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }

  // ==================== FILE MANAGEMENT ====================

  async addFiles(
    id: string,
    fileDataList: {
      filename: string;
      path: string;
      mimetype: string;
      size: number;
      uploadedBy: string;
    }[],
  ): Promise<InternalDocument> {
    const now = new Date();
    const filesToAdd = fileDataList.map((f) => ({
      ...f,
      uploadedAt: now,
    }));

    const document = await this.documentModel
      .findByIdAndUpdate(
        id,
        { $push: { files: { $each: filesToAdd } } },
        { new: true },
      )
      .populate('category')
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .populate('files.uploadedBy', 'fullName avatar')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    for (const f of fileDataList) {
      await this.activityLogsService.log({
        entityType: 'INTERNAL_DOCUMENT',
        entityId: id,
        action: 'file_uploaded',
        message: `File uploaded: ${f.filename}`,
        userId: f.uploadedBy,
      });
    }

    this.socketGateway.emitToCompany(document.companyId?.toString(), 'internalDocumentFileUploaded', {
      documentId: id,
      document,
    });

    return document;
  }

  async getFile(documentId: string, fileId: string) {
    const document = await this.documentModel.findById(documentId).exec();
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const file = document.files.find((f: any) => f._id.toString() === fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (!file.path || !fs.existsSync(file.path)) {
      throw new NotFoundException('File not found on disk');
    }

    return {
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async removeFile(
    documentId: string,
    fileId: string,
    userId: string,
  ): Promise<InternalDocument> {
    const doc = await this.documentModel.findById(documentId).exec();
    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const file = doc.files.find((f: any) => f._id.toString() === fileId);
    const fileName = file ? file.filename : 'Unknown file';

    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const document = await this.documentModel
      .findByIdAndUpdate(
        documentId,
        { $pull: { files: { _id: fileId } } },
        { new: true },
      )
      .populate('category')
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .populate('files.uploadedBy', 'fullName avatar')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'INTERNAL_DOCUMENT',
      entityId: documentId,
      action: 'deleted',
      message: `File deleted: ${fileName}`,
      userId,
    });

    this.socketGateway.emitToCompany(doc.companyId?.toString(), 'internalDocumentFileDeleted', {
      documentId,
      fileId,
      filename: fileName,
    });

    return document;
  }

  // ==================== ACTIVITIES ====================

  async getActivities(documentId: string) {
    const document = await this.documentModel.findById(documentId).exec();
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return this.activityLogsService.findByEntity(
      'INTERNAL_DOCUMENT',
      documentId,
    );
  }

  async addComment(documentId: string, message: string, userId: string) {
    const document = await this.documentModel.findById(documentId).exec();
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const comment = await this.activityLogsService.log({
      entityType: 'INTERNAL_DOCUMENT',
      entityId: documentId,
      action: 'comment',
      message,
      userId,
      metadata: { content: message },
    });

    const populatedComment = await comment.populate(
      'userId',
      'fullName email avatar',
    );

    this.socketGateway.emitToCompany(document.companyId?.toString(), 'internalDocumentCommentAdded', {
      documentId,
      comment: populatedComment,
    });

    return populatedComment;
  }
}
