import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  // Disable CSP in dev so Swagger UI inline scripts load
  app.use(helmet({ contentSecurityPolicy: isProduction }));
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('City Mega Church CMS API')
      .setDescription('REST API for the City Mega Church management system')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
    });
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running → http://localhost:${port}/api`);
  if (!isProduction) {
    console.log(`Swagger UI  → http://localhost:${port}/api/docs`);
    console.log(`Swagger JSON→ http://localhost:${port}/api/docs-json`);
  }
}

void bootstrap();
