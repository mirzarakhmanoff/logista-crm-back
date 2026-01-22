import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document, DocumentStatus } from './schemas/document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ActivitiesService } from '../activities/activities.service';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name) private documentModel: Model<Document>,
    @Inject(forwardRef(() => ActivitiesService))
    private activitiesService: ActivitiesService,
    private socketGateway: SocketGateway,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    createdById: string,
  ): Promise<Document> {
    const document = new this.documentModel({
      ...createDocumentDto,
      createdBy: createdById,
    });

    const savedDocument = await document.save();

    // Populate qilib qaytarish
    const populatedDocument = await this.documentModel
      .findById(savedDocument._id)
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!populatedDocument) {
      throw new NotFoundException('Failed to create document');
    }

    // Real-time: Yangi dokument yaratildi (global)
    this.socketGateway.emitDocumentCreated(populatedDocument);

    return populatedDocument;
  }

  async findAll(filterDto: FilterDocumentDto): Promise<Document[]> {
    const query: any = {};

    // Agar isArchived filter yo'q bo'lsa, faqat active dokumentlarni ko'rsatamiz
    if (filterDto.isArchived !== undefined) {
      query.isArchived = filterDto.isArchived;
    } else {
      query.isArchived = false;
    }

    // Filters
    if (filterDto.type) query.type = filterDto.type;
    if (filterDto.status) query.status = filterDto.status;
    if (filterDto.priority) query.priority = filterDto.priority;
    if (filterDto.assignedTo) query.assignedTo = filterDto.assignedTo;
    if (filterDto.category) query.category = filterDto.category;

    // Search
    if (filterDto.search) {
      query.$or = [
        { title: { $regex: filterDto.search, $options: 'i' } },
        { description: { $regex: filterDto.search, $options: 'i' } },
        { documentNumber: { $regex: filterDto.search, $options: 'i' } },
      ];
    }

    return this.documentModel
      .find(query)
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .populate('files.uploadedBy', 'fullName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentModel
      .findById(id)
      .populate('assignedTo', 'fullName avatar email phone')
      .populate('createdBy', 'fullName avatar email phone')
      .populate('files.uploadedBy', 'fullName avatar')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    userId: string,
  ): Promise<Document> {
    const oldDocument = await this.findOne(id);

    const document = await this.documentModel
      .findByIdAndUpdate(id, updateDocumentDto, { new: true })
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Agar assignedTo o'zgargan bo'lsa, activity yaratish
    if (
      updateDocumentDto.assignedTo &&
      oldDocument.assignedTo.toString() !== updateDocumentDto.assignedTo
    ) {
      await this.activitiesService.createAssignmentChangeActivity(
        id,
        userId,
        oldDocument.assignedTo.toString(),
        updateDocumentDto.assignedTo,
      );
    }

    // Real-time: Dokument yangilandi
    this.socketGateway.emitDocumentUpdated(id, document);

    return document;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
    userId: string,
  ): Promise<Document> {
    const document = await this.findOne(id);
    const oldStatus = document.status;

    // Agar status COMPLETED ga o'zgartirilsa, completedAt ni set qilamiz
    const updateData: any = { status: updateStatusDto.status };
    if (updateStatusDto.status === DocumentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updatedDocument = await this.documentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!updatedDocument) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Activity yaratish
    await this.activitiesService.createStatusChangeActivity(
      id,
      userId,
      oldStatus,
      updateStatusDto.status,
    );

    // Real-time: Status o'zgartirildi
    this.socketGateway.emitDocumentStatusChanged(id, {
      documentId: id,
      oldStatus,
      newStatus: updateStatusDto.status,
      document: updatedDocument,
    });

    return updatedDocument;
  }

  async remove(id: string): Promise<void> {
    const result = await this.documentModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Real-time: Dokument o'chirildi
    this.socketGateway.emitDocumentDeleted(id);
  }

  async addFile(
    id: string,
    fileData: {
      filename: string;
      path: string;
      mimetype: string;
      size: number;
      uploadedBy: string;
    },
  ): Promise<Document> {
    const document = await this.documentModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            files: {
              ...fileData,
              uploadedAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .populate('files.uploadedBy', 'fullName avatar')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Activity yaratish
    await this.activitiesService.createFileUploadActivity(
      id,
      fileData.uploadedBy,
      fileData.filename,
    );

    // Real-time: Fayl yuklandi
    this.socketGateway.emitFileUploaded(id, {
      documentId: id,
      filename: fileData.filename,
      document,
    });

    return document;
  }

  async removeFile(
    documentId: string,
    fileId: string,
    userId: string,
  ): Promise<Document> {
    // Avval file nomini olish
    const doc = await this.documentModel.findById(documentId).exec();
    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const file = doc.files.find((f: any) => f._id.toString() === fileId);
    const fileName = file ? file.filename : 'Unknown file';

    const document = await this.documentModel
      .findByIdAndUpdate(
        documentId,
        {
          $pull: { files: { _id: fileId } },
        },
        { new: true },
      )
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .populate('files.uploadedBy', 'fullName avatar')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Activity yaratish
    await this.activitiesService.createFileDeleteActivity(
      documentId,
      userId,
      fileName,
    );

    // Real-time: Fayl o'chirildi
    this.socketGateway.emitFileDeleted(documentId, {
      documentId,
      fileId,
      filename: fileName,
      document,
    });

    return document;
  }

  async getDocumentsByStatus(status: DocumentStatus): Promise<Document[]> {
    return this.documentModel
      .find({ status, isArchived: false })
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getDocumentStats() {
    const stats = await this.documentModel.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats;
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

    return {
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
