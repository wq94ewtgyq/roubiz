import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Dashboard (통계)')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('monthly')
  @ApiOperation({ summary: '월별 실시간 추정 손익 조회' })
  @ApiQuery({ name: 'month', required: false, example: '2026-02', description: '조회할 월 (YYYY-MM)' })
  getMonthlyStats(@Query('month') month?: string) {
    // 월이 없으면 현재 월로 설정
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.dashboardService.getMonthlyStats(targetMonth);
  }
}