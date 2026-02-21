import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from './db/db.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DessmonitorModule } from './dessmonitor/dessmonitor.module';
import { DataModule } from './data/data.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DbModule,
    CredentialsModule,
    DessmonitorModule,
    DataModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
