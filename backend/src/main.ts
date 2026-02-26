import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedServices } from './services/services.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Seed reference data (idempotent — skips existing rows)
  const dataSource = app.get<DataSource>(getDataSourceToken());
  await seedServices(dataSource);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`HamshiraGo API running at http://localhost:${port}`);
}

bootstrap();