import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module';
import { DessmonitorScheduler } from './dessmonitor.scheduler';
import { DessmonitorService } from './dessmonitor.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 5,
    }),
    CredentialsModule,
  ],
  providers: [DessmonitorService, DessmonitorScheduler],
  exports: [DessmonitorService],
})
export class DessmonitorModule {}
