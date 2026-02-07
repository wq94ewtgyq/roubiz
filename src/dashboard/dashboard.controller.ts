// src/dashboard/dashboard.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Dashboard (경영 리포트)')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: '월별 손익 리포트 조회' })
  @ApiQuery({ name: 'month', example: '2026-02', description: '조회할 연월 (YYYY-MM)' })
  getStats(@Query('month') month: string) {
    // 만약 month를 안 넣으면 자동으로 '이번 달'로 설정하는 센스
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.dashboardService.getMonthlyStats(targetMonth);
  }
}