import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';

// Load .env from project root (monorepo: cwd may be server/)
config({ path: join(process.cwd(), '.env') });
config({ path: join(process.cwd(), '..', '.env') });
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
