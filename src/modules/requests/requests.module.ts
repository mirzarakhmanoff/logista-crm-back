import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Request, RequestSchema } from './schemas/request.schema';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { ClientsModule } from '../clients/clients.module';
import { RequestStatusesModule } from '../request-statuses/request-statuses.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Request.name, schema: RequestSchema }]),
    forwardRef(() => ClientsModule),
    RequestStatusesModule,
    ActivityLogsModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService, MongooseModule],
})
export class RequestsModule {}
