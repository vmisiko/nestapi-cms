import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('City Mega Church CMS API')
    .setDescription('REST API for the City Mega Church management system')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outPath = resolve(__dirname, '..', 'swagger.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2), 'utf8');
  console.log(`Swagger JSON written to ${outPath}`);

  await app.close();
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
