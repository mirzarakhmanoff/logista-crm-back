import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Logista CRM API')
    .setDescription('REST API documentation for Logista CRM system')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT',
    )
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Documents', 'Document management endpoints')
    .addTag('Activities', 'Comments and timeline activities')
    .addTag('Clients', 'Client management endpoints')
    .addTag('Dashboard', 'Dashboard overview endpoints')
    .addTag('Requests', 'Request management endpoints')
    .addTag('Shipments', 'Shipment management endpoints')
    .addTag('Invoices', 'Invoice management endpoints')
    .addTag('Rate Quotes', 'Rate quote management endpoints')
    .addTag('Issued Codes', 'Issued code management endpoints')
    .addTag('Request Statuses', 'Request status management endpoints')
    .addTag('Agents', 'Agent management endpoints')
    .addTag('Accounting', 'Accounting and financial endpoints')
    .addTag('Reports', 'Reports and analytics endpoints')
    .addTag('Chat', 'Real-time chat endpoints')
    .addTag('Email', 'Email management endpoints')
    .addTag('Archive', 'Archive management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs\n`);
}
bootstrap();
