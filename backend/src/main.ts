import 'dotenv/config';
import { createServer } from 'node:http';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestAbortedFilter } from './common/request-aborted.filter';
import { AVATAR_DIR, AVATAR_URL_PREFIX } from './common/uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    exposedHeaders: ['Content-Disposition'],
  });
  // Pieces of resumable photo uploads arrive as raw bytes (1 MB each).
  app.useBodyParser('raw', { type: 'application/octet-stream', limit: '2mb' });
  app.useGlobalFilters(
    new RequestAbortedFilter(app.get(HttpAdapterHost).httpAdapter),
  );
  // Only avatars are public (GET /uploads/avatars/<file>.webp). Survey photos
  // live under uploads/ too but are streamed by an authenticated endpoint.
  app.useStaticAssets(AVATAR_DIR, {
    prefix: AVATAR_URL_PREFIX,
    index: false,
    maxAge: '7d',
  });

  const swaggerDocumentConfig = new DocumentBuilder()
    .setTitle('Survey API')
    .setDescription('API documentation for the Survey backend')
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerDocumentConfig,
  );
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api-docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const apiPort = Number(process.env.PORT) || 5000;
  const swaggerPort = Number(process.env.SWAGGER_PORT) || apiPort;

  await app.listen(apiPort);

  if (swaggerPort !== apiPort) {
    const swaggerServer = createServer(app.getHttpAdapter().getInstance());

    await new Promise<void>((resolve, reject) => {
      swaggerServer.once('error', reject);
      swaggerServer.listen(swaggerPort, resolve);
    });
  }

  console.log(`API: http://localhost:${apiPort}`);
  console.log(`Swagger UI: http://localhost:${swaggerPort}/api-docs`);
}
void bootstrap();
