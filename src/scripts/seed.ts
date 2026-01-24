import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RequestStatusesService } from '../modules/request-statuses/request-statuses.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const statusesService = app.get(RequestStatusesService);

  console.log('Seeding request statuses...');
  await statusesService.seedDefaultStatuses();
  console.log('Seed completed!');

  await app.close();
}

bootstrap().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
