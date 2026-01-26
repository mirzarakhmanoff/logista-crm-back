import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ClientsModule } from './modules/clients/clients.module';
import { RequestsModule } from './modules/requests/requests.module';
import { RateQuotesModule } from './modules/rate-quotes/rate-quotes.module';
import { IssuedCodesModule } from './modules/issued-codes/issued-codes.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SocketModule } from './socket/socket.module';
import { getDatabaseConfig } from './config/database.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    SocketModule,
    AuthModule,
    UsersModule,
    DocumentsModule,
    ClientsModule,
    RequestsModule,
    RateQuotesModule,
    IssuedCodesModule,
    ShipmentsModule,
    InvoicesModule,
    ActivityLogsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
