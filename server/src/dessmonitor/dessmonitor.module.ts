import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CredentialsModule } from '../credentials/credentials.module';
import { DessmonitorService } from './dessmonitor.service';
import { DessmonitorScheduler } from './dessmonitor.scheduler';

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
