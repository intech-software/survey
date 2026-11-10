import 'dotenv/config';
import { createServer } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UPLOADS_ROOT, UPLOADS_URL_PREFIX } from './common/uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    exposedHeaders: ['Content-Disposition'],
  });
  // Public files such as avatars: GET /uploads/avatars/<file>.webp
  app.useStaticAssets(UPLOADS_ROOT, {
    prefix: UPLOADS_URL_PREFIX,
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
