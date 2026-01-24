import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IssuedCode, IssuedCodeSchema } from './schemas/issued-code.schema';
import { IssuedCodesService } from './issued-codes.service';
import { IssuedCodesController } from './issued-codes.controller';
import { RequestsModule } from '../requests/requests.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: IssuedCode.name, schema: IssuedCodeSchema }]),
    RequestsModule,
    ActivityLogsModule,
  ],
  controllers: [IssuedCodesController],
  providers: [IssuedCodesService],
  exports: [IssuedCodesService],
})
export class IssuedCodesModule {}
