import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  PersonnelDocumentCategory,
  PersonnelDocumentCategorySchema,
} from './schemas/personnel-document-category.schema';
import {
  PersonnelDocument,
  PersonnelDocumentSchema,
} from './schemas/personnel-document.schema';
import { PersonnelDocumentsService } from './personnel-documents.service';
import { PersonnelDocumentsController } from './personnel-documents.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PersonnelDocumentCategory.name,
        schema: PersonnelDocumentCategorySchema,
      },
      { name: PersonnelDocument.name, schema: PersonnelDocumentSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/personnel-documents',
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
  controllers: [PersonnelDocumentsController],
  providers: [PersonnelDocumentsService],
  exports: [PersonnelDocumentsService],
})
export class PersonnelDocumentsModule {}
