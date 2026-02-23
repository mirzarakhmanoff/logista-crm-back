import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import { PersonnelDocumentCategory } from './schemas/personnel-document-category.schema';
import {
  PersonnelDocument,
  PersonnelDocumentStatus,
} from './schemas/personnel-document.schema';
import { CreatePersonnelDocumentCategoryDto } from './dto/create-personnel-document-category.dto';
import { UpdatePersonnelDocumentCategoryDto } from './dto/update-personnel-document-category.dto';
import { CreatePersonnelDocumentDto } from './dto/create-personnel-document.dto';
import { UpdatePersonnelDocumentDto } from './dto/update-personnel-document.dto';
import { FilterPersonnelDocumentDto } from './dto/filter-personnel-document.dto';
import { UpdatePersonnelDocumentStatusDto } from './dto/update-personnel-document-status.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SocketGateway } from '../../socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class PersonnelDocumentsService {
  constructor(
    @InjectModel(PersonnelDocumentCategory.name)
    private categoryModel: Model<PersonnelDocumentCategory>,
    @InjectModel(PersonnelDocument.name)
    private documentModel: Model<PersonnelDocument>,
    private activityLogsService: ActivityLogsService,
    private socketGateway: SocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== CATEGORIES ====================

  async createCategory(
    dto: CreatePersonnelDocumentCategoryDto,
    userId: string,
    companyId: string,
  ): Promise<PersonnelDocumentCategory> {
    const category = new this.categoryModel({
      ...dto,
      createdBy: userId,
      companyId,
    });
    return category.save();
  }

  async findAllCategories(companyId: string): Promise<any[]> {
    const categories = await this.categoryModel
      .find({ isArchived: false, companyId: companyId })
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

  async findCategoryById(id: string): Promise<PersonnelDocumentCategory> {
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
    dto: UpdatePersonnelDocumentCategoryDto,
  ): Promise<PersonnelDocumentCategory> {
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

  async getGlobalStats(companyId: string): Promise<{
    total: number;
    active: number;
    underReview: number;
    archived: number;
  }> {
    const filter = { companyId: companyId, isArchived: false };
    const [total, active, underReview, archived] = await Promise.all([
      this.documentModel.countDocuments(filter),
      this.documentModel.countDocuments({
        ...filter,
        status: PersonnelDocumentStatus.ACTIVE,
      }),
      this.documentModel.countDocuments({
        ...filter,
        status: PersonnelDocumentStatus.UNDER_REVIEW,
      }),
      this.documentModel.countDocuments({
        companyId: companyId,
        isArchived: true,
      }),
    ]);

    return { total, active, underReview, archived };
  }

  // ==================== DOCUMENTS ====================

  async createDocument(
    dto: CreatePersonnelDocumentDto,
    userId: string,
    companyId: string,
  ): Promise<PersonnelDocument> {
    let savedDocument!: PersonnelDocument;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const document = new this.documentModel({
          ...dto,
          createdBy: userId,
          companyId: companyId,
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
      entityType: 'PERSONNEL_DOCUMENT',
      entityId: populated._id.toString(),
      action: 'created',
      message: `Personnel document created: ${populated.documentNumber}`,
      userId,
      companyId,
    });

    this.socketGateway.emitToCompany(companyId, 'personnelDocumentCreated', populated);

    this.notificationsService.create({
      type: NotificationType.PERSONNEL_DOC_CREATED,
      title: 'Новый кадровый документ',
      message: `Создан новый кадровый документ: ${populated.documentNumber}`,
      entityType: 'PERSONNEL_DOCUMENT',
      entityId: populated._id.toString(),
      createdBy: userId,
      companyId,
    });

    return populated;
  }

  async findAllDocuments(
    filterDto: FilterPersonnelDocumentDto,
    companyId: string,
  ): Promise<{ data: PersonnelDocument[]; total: number; page: number; limit: number }> {
    const query: any = { companyId: companyId };
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 20;
    const skip = (page - 1) * limit;

    if (filterDto.isArchived !== undefined) {
      query.isArchived = filterDto.isArchived;
    } else if (filterDto.status === PersonnelDocumentStatus.ARCHIVED) {
      query.isArchived = true;
    } else {
      query.isArchived = false;
    }

    if (filterDto.category) query.category = filterDto.category;
    if (filterDto.status) query.status = filterDto.status;
    if (filterDto.type) query.type = filterDto.type;
    if (filterDto.assignedTo) query.assignedTo = filterDto.assignedTo;

    if (filterDto.search) {
      query.$or = [
        { title: { $regex: filterDto.search, $options: 'i' } },
        { documentNumber: { $regex: filterDto.search, $options: 'i' } },
        { description: { $regex: filterDto.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.documentModel
        .find(query)
        .populate('category')
        .populate('assignedTo', 'fullName avatar email')
        .populate('createdBy', 'fullName avatar email')
        .populate('files.uploadedBy', 'fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findDocumentById(id: string): Promise<PersonnelDocument> {
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
    dto: UpdatePersonnelDocumentDto,
    userId: string,
  ): Promise<PersonnelDocument> {
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
      entityType: 'PERSONNEL_DOCUMENT',
      entityId: id,
      action: 'updated',
      message: 'Personnel document updated',
      userId,
      companyId: document.companyId?.toString(),
    });

    this.socketGateway.emitToCompany(document.companyId?.toString(), 'personnelDocumentUpdated', document);

    this.notificationsService.create({
      type: NotificationType.PERSONNEL_DOC_UPDATED,
      title: 'Кадровый документ обновлён',
      message: `Кадровый документ обновлён: ${document.documentNumber}`,
      entityType: 'PERSONNEL_DOCUMENT',
      entityId: id,
      createdBy: userId,
      companyId: document.companyId?.toString(),
    });

    return document;
  }

  async updateDocumentStatus(
    id: string,
    dto: UpdatePersonnelDocumentStatusDto,
    userId: string,
  ): Promise<PersonnelDocument> {
    const document = await this.findDocumentById(id);
    const oldStatus = document.status;

    const updateData: any = { status: dto.status };

    if (dto.status === PersonnelDocumentStatus.ARCHIVED) {
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
      entityType: 'PERSONNEL_DOCUMENT',
      entityId: id,
      action: 'status_changed',
      message: `Status changed from ${oldStatus} to ${dto.status}`,
      userId,
      companyId: updated.companyId?.toString(),
    });

    this.socketGateway.emitToCompany(updated.companyId?.toString(), 'personnelDocumentStatusChanged', {
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

    this.socketGateway.emitToCompany(companyId, 'personnelDocumentDeleted', {
      documentId: id,
    });
  }

  // ==================== CATEGORY STATS ====================

  async getCategoryStats(
    categoryId: string,
  ): Promise<{ total: number; active: number; underReview: number }> {
    const [total, active, underReview] = await Promise.all([
      this.documentModel.countDocuments({
        category: categoryId,
        isArchived: false,
      }),
      this.documentModel.countDocuments({
        category: categoryId,
        status: PersonnelDocumentStatus.ACTIVE,
        isArchived: false,
      }),
      this.documentModel.countDocuments({
        category: categoryId,
        status: PersonnelDocumentStatus.UNDER_REVIEW,
        isArchived: false,
      }),
    ]);

    return { total, active, underReview };
  }

  async getDocumentStatsByStatus(companyId: string, categoryId?: string) {
    const match: any = { companyId: companyId, isArchived: false };
    if (categoryId) match.category = new Types.ObjectId(categoryId);

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
  ): Promise<PersonnelDocument> {
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
        entityType: 'PERSONNEL_DOCUMENT',
        entityId: id,
        action: 'file_uploaded',
        message: `File uploaded: ${f.filename}`,
        userId: f.uploadedBy,
        companyId: document.companyId?.toString(),
      });
    }

    this.socketGateway.emitToCompany(document.companyId?.toString(), 'personnelDocumentFileUploaded', {
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
  ): Promise<PersonnelDocument> {
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
      entityType: 'PERSONNEL_DOCUMENT',
      entityId: documentId,
      action: 'deleted',
      message: `File deleted: ${fileName}`,
      userId,
      companyId: doc.companyId?.toString(),
    });

    this.socketGateway.emitToCompany(doc.companyId?.toString(), 'personnelDocumentFileDeleted', {
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
      'PERSONNEL_DOCUMENT',
      documentId,
    );
  }

  async addComment(documentId: string, message: string, userId: string) {
    const document = await this.documentModel.findById(documentId).exec();
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const comment = await this.activityLogsService.log({
      entityType: 'PERSONNEL_DOCUMENT',
      entityId: documentId,
      action: 'comment',
      message,
      userId,
      metadata: { content: message },
      companyId: document.companyId?.toString(),
    });

    const populatedComment = await comment.populate(
      'userId',
      'fullName email avatar',
    );

    this.socketGateway.emitToCompany(document.companyId?.toString(), 'personnelDocumentCommentAdded', {
      documentId,
      comment: populatedComment,
    });

    return populatedComment;
  }
}
