import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Settlement (정산 관리)')
@Controller('settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  // [1] 전체 정산 장부 (기간/거래처 필터)
  @Get()
  @ApiOperation({ summary: '전체 정산 장부 조회 (기간·거래처 필터)' })
  @ApiQuery({ name: 'from',     required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to',       required: false, example: '2026-01-31' })
  @ApiQuery({ name: 'month',    required: false, example: '2026-01',   description: 'YYYY-MM 형식, from/to 보다 우선' })
  @ApiQuery({ name: 'clientId', required: false, type: Number })
  findAll(
    @Query('from')      from?: string,
    @Query('to')        to?: string,
    @Query('month')     month?: string,
    @Query('clientId')  clientId?: string,
  ) {
    return this.settlementService.findAll({
      from,
      to,
      month,
      clientId: clientId ? Number(clientId) : undefined,
    });
  }

  // [2] 손익장 (P&L Report) — 거래처별 집계
  @Get('report')
  @ApiOperation({ summary: '손익장 (P&L Report) — 거래처별 집계' })
  @ApiQuery({ name: 'from',  required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to',    required: false, example: '2026-01-31' })
  @ApiQuery({ name: 'month', required: false, example: '2026-01' })
  getProfitLossReport(
    @Query('from')  from?: string,
    @Query('to')    to?: string,
    @Query('month') month?: string,
  ) {
    return this.settlementService.getProfitLossReport({ from, to, month });
  }

  // [3] 판매처별 정산 출력용 데이터
  @Get('client-settlements')
  @ApiOperation({ summary: '판매처별 정산 출력용 데이터 (양식 등록된 거래처만)' })
  @ApiQuery({ name: 'from',  required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to',    required: false, example: '2026-01-31' })
  @ApiQuery({ name: 'month', required: false, example: '2026-01' })
  getClientSettlements(
    @Query('from')  from?: string,
    @Query('to')    to?: string,
    @Query('month') month?: string,
  ) {
    return this.settlementService.getClientSettlements({ from, to, month });
  }

  // [4] 특정 주문 정산 상세
  @Get(':orderId')
  @ApiOperation({ summary: '특정 주문 정산 내역 상세 계산' })
  calculate(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.settlementService.calculate(orderId);
  }
}
