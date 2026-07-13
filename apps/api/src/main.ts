import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { INestApplication } from '@nestjs/common';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import type { AppConfig } from './config/configuration';

let app: INestApplication;

async function bootstrap() {
  app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<AppConfig, true>);
  const api = config.get('api', { infer: true });

  // ── Security ──────────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      // Same-origin/server-to-server callers (curl, health checks) send no Origin.
      if (!origin || api.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      // A blocked origin is otherwise invisible server-side — the browser just
      // reports a missing header. Log it so misconfiguration is obvious.
      app
        .get(Logger)
        .warn(
          `CORS: blocked origin "${origin}". Allowed: ${api.corsOrigins.join(', ')}`,
        );
      return callback(null, false);
    },
    credentials: true,
  });
  app.get(Logger).log(`CORS allowed origins: ${api.corsOrigins.join(', ')}`);

  // ── Global pipeline ───────────────────────────────────────
  app.setGlobalPrefix(api.globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableShutdownHooks();

  // ── OpenAPI / Swagger ─────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Amstel Rewards Platform API')
    .setDescription('Loyalty, Rewards & Tournament Management Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.init();
  return app;
}

// Local development: listen on port
if (require.main === module) {
  bootstrap().then(async (app) => {
    const config = app.get(ConfigService<AppConfig, true>);
    const api = config.get('api', { infer: true });
    await app.listen(api.port, '0.0.0.0');
    console.log(`API ready on http://localhost:${api.port}/${api.globalPrefix}`);
    console.log(`Swagger docs on http://localhost:${api.port}/docs`);
  });
}

// Vercel serverless handler
export const handler = async (req: any, res: any) => {
  if (!app) {
    app = await bootstrap();
  }
  return (app as any).getHttpAdapter().getInstance()(req, res);
};
