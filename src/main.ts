import {
  configureObservability,
  createServiceLogger,
} from './observability/observability';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Callable CommonJS dependency.
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createServiceLogger(),
  });
  configureObservability(app);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
  );

  await app.listen(process.env.PORT ?? 3010, '0.0.0.0');
}
bootstrap().catch(() => {
  new Logger('Bootstrap').error({
    event: 'service_startup',
    outcome: 'failure',
    reason: 'startup_failed',
  });
  process.exit(1);
});
