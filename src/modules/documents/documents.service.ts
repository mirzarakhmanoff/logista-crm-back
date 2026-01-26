import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document, DocumentStatus } from './schemas/document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name) private documentModel: Model<Document>,
    private activityLogsService: ActivityLogsService,
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

    const populatedDocument = await this.documentModel
      .findById(savedDocument._id)
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!populatedDocument) {
      throw new NotFoundException('Failed to create document');
    }

    this.socketGateway.emitToAll('documentCreated', populatedDocument);

    return populatedDocument;
  }

  async findAll(filterDto: FilterDocumentDto): Promise<Document[]> {
    const query: any = {};

    if (filterDto.isArchived !== undefined) {
      query.isArchived = filterDto.isArchived;
    } else if (filterDto.status === DocumentStatus.ARCHIVED) {
      query.isArchived = true;
    } else {
      query.isArchived = false;
    }

    if (filterDto.type) query.type = filterDto.type;
    if (filterDto.status) query.status = filterDto.status;
    if (filterDto.priority) query.priority = filterDto.priority;
    if (filterDto.assignedTo) query.assignedTo = filterDto.assignedTo;
    if (filterDto.category) query.category = filterDto.category;

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
    const document = await this.documentModel
      .findByIdAndUpdate(id, updateDocumentDto, { new: true })
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'DOCUMENT',
      entityId: id,
      action: 'updated',
      message: 'Document updated',
      userId,
    });

    this.socketGateway.emitToAll('documentUpdated', document);

    return document;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
    userId: string,
  ): Promise<Document> {
    const document = await this.findOne(id);
    const oldStatus = document.status;

    const updateData: any = { status: updateStatusDto.status };
    if (updateStatusDto.status === DocumentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }
    if (updateStatusDto.status === DocumentStatus.ARCHIVED) {
      updateData.isArchived = true;
    } else {
      updateData.isArchived = false;
    }

    const updatedDocument = await this.documentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!updatedDocument) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'DOCUMENT',
      entityId: id,
      action: 'status_changed',
      message: `Status changed from ${oldStatus} to ${updateStatusDto.status}`,
      userId,
    });

    this.socketGateway.emitToAll('documentStatusChanged', {
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

    this.socketGateway.emitToAll('documentDeleted', { documentId: id });
  }

  async addFiles(
    id: string,
    fileDataList: {
      filename: string;
      path: string;
      mimetype: string;
      size: number;
      uploadedBy: string;
    }[],
  ): Promise<Document> {
    const now = new Date();
    const filesToAdd = fileDataList.map((fileData) => ({
      ...fileData,
      uploadedAt: now,
    }));

    const document = await this.documentModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            files: {
              $each: filesToAdd,
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

    for (const fileData of fileDataList) {
      await this.activityLogsService.log({
        entityType: 'DOCUMENT',
        entityId: id,
        action: 'file_uploaded',
        message: `File uploaded: ${fileData.filename}`,
        userId: fileData.uploadedBy,
      });

      this.socketGateway.emitToAll('fileUploaded', {
        documentId: id,
        filename: fileData.filename,
        document,
      });
    }

    return document;
  }

  async removeFile(
    documentId: string,
    fileId: string,
    userId: string,
  ): Promise<Document> {
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

    await this.activityLogsService.log({
      entityType: 'DOCUMENT',
      entityId: documentId,
      action: 'deleted',
      message: `File deleted: ${fileName}`,
      userId,
    });

    this.socketGateway.emitToAll('fileDeleted', {
      documentId,
      fileId,
      filename: fileName,
      document,
    });

    return document;
  }

  async getDocumentsByStatus(status: DocumentStatus): Promise<Document[]> {
    const query =
      status === DocumentStatus.ARCHIVED
        ? { status, isArchived: true }
        : { status, isArchived: false };
    return this.documentModel
      .find(query)
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

  async getActivities(documentId: string) {
    const document = await this.documentModel.findById(documentId).exec();
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return this.activityLogsService.findByEntity('DOCUMENT', documentId);
  }

  async addComment(documentId: string, message: string, userId: string) {
    const document = await this.documentModel.findById(documentId).exec();
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'DOCUMENT',
      entityId: documentId,
      action: 'comment',
      message,
      userId,
      metadata: {
        content: message,
      },
    });

    return this.activityLogsService.findByEntity('DOCUMENT', documentId);
  }
}
