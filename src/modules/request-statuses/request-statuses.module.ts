import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestStatus, RequestStatusSchema } from './schemas/request-status.schema';
import { RequestTransition, RequestTransitionSchema } from './schemas/request-transition.schema';
import { RequestStatusesService } from './request-statuses.service';
import { RequestStatusesController } from './request-statuses.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RequestStatus.name, schema: RequestStatusSchema },
      { name: RequestTransition.name, schema: RequestTransitionSchema },
    ]),
  ],
  controllers: [RequestStatusesController],
  providers: [RequestStatusesService],
  exports: [RequestStatusesService, MongooseModule],
})
export class RequestStatusesModule {}
