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

  const allowedOrigins = [
    'https://hamshirago-web.vercel.app',
    'https://hamshirago-web-medic.vercel.app',
    // Allow local dev for both web apps
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3002',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
  });

  // Seed reference data (idempotent — skips existing rows)
  const dataSource = app.get<DataSource>(getDataSourceToken());
  await seedServices(dataSource);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`HamshiraGo API running at http://localhost:${port}`);
}

bootstrap();
// test