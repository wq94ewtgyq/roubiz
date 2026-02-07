// src/settlement/settlement.controller.ts
import { Controller, Post, Get, Param } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Settlement (정산 관리)')
@Controller('settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post(':orderId')
  @ApiOperation({ summary: '특정 주문 정산 실행하기' })
  calculate(@Param('orderId') orderId: string) {
    return this.settlementService.calculate(+orderId);
  }

  @Get()
  @ApiOperation({ summary: '전체 정산 장부 조회' })
  findAll() {
    return this.settlementService.findAll();
  }
}