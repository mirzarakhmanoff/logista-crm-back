import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request, RequestSchema } from './schemas/request.schema';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { ClientsModule } from '../clients/clients.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Request.name, schema: RequestSchema }]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/requests',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `request-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    forwardRef(() => ClientsModule),
    ActivityLogsModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService, MongooseModule],
})
export class RequestsModule {}
