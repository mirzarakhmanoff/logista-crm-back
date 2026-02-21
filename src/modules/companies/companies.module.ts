import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { Company, CompanySchema } from './schemas/company.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
    UsersModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService, MongooseModule],
})
export class CompaniesModule {}
