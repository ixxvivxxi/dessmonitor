import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module';
import { DessmonitorModule } from '../dessmonitor/dessmonitor.module';
import { DataController } from './data.controller';
import { DataService } from './data.service';

@Module({
  imports: [CredentialsModule, DessmonitorModule],
  controllers: [DataController],
  providers: [DataService],
})
export class DataModule {}
