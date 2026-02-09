import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { OperationalPaymentsController } from './operational-payments.controller';
import { OperationalPaymentsService } from './operational-payments.service';
import {
  OperationalPayment,
  OperationalPaymentSchema,
} from './schemas/operational-payment.schema';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { SocketModule } from '../../socket/socket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OperationalPayment.name, schema: OperationalPaymentSchema },
    ]),
    MulterModule.register({
      dest: './uploads/operational-payments',
    }),
    ActivityLogsModule,
    SocketModule,
  ],
  controllers: [OperationalPaymentsController],
  providers: [OperationalPaymentsService],
  exports: [OperationalPaymentsService, MongooseModule],
})
export class OperationalPaymentsModule {}
