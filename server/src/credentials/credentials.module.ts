import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { DessmonitorAuthService } from './dessmonitor-auth.service';

@Module({
  imports: [
    DbModule,
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 5,
    }),
  ],
  controllers: [CredentialsController],
  providers: [CredentialsService, DessmonitorAuthService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
