import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  DocumentCategory,
  DocumentCategorySchema,
} from './schemas/document-category.schema';
import {
  InternalDocument,
  InternalDocumentSchema,
} from './schemas/internal-document.schema';
import { InternalDocumentsService } from './internal-documents.service';
import { InternalDocumentsController } from './internal-documents.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentCategory.name, schema: DocumentCategorySchema },
      { name: InternalDocument.name, schema: InternalDocumentSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/internal-documents',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB
      },
    }),
    ActivityLogsModule,
  ],
  controllers: [InternalDocumentsController],
  providers: [InternalDocumentsService],
  exports: [InternalDocumentsService],
})
export class InternalDocumentsModule {}
