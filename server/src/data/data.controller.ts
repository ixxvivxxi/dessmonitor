import { Controller, Get, Query } from '@nestjs/common';
import { DataService } from './data.service';

@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('latest')
  getLatest() {
    return this.dataService.getLatest();
  }

  @Get('chart')
  getChart(
    @Query('field') field: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    if (!field) return { error: 'field is required' };
    const startDate = start ?? '2000-01-01 00:00:00';
    const endDate = end ?? '2099-12-31 23:59:59';
    return this.dataService.getChartData(field, startDate, endDate);
  }

  @Get('key-param')
  getKeyParam(
    @Query('parameter') parameter: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    if (!parameter) return { error: 'parameter is required' };
    const startDate = start ?? '2000-01-01 00:00:00';
    const endDate = end ?? '2099-12-31 23:59:59';
    return this.dataService.getKeyParamData(parameter, startDate, endDate);
  }
}
