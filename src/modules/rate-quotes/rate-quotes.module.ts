import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RateQuote, RateQuoteSchema } from './schemas/rate-quote.schema';
import { RateQuotesService } from './rate-quotes.service';
import { RateQuotesController } from './rate-quotes.controller';
import { RequestsModule } from '../requests/requests.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RateQuote.name, schema: RateQuoteSchema }]),
    RequestsModule,
    ActivityLogsModule,
  ],
  controllers: [RateQuotesController],
  providers: [RateQuotesService],
  exports: [RateQuotesService],
})
export class RateQuotesModule {}
