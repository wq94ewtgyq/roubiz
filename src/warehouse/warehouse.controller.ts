import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('창고 관리 (Warehouse)')
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ─────────────────────────────────────
  // 창고 CRUD
  // ─────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '창고 전체 목록 조회' })
  findAll() {
    return this.warehouseService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '창고 상세 조회 (재고 포함)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '창고 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['businessId', 'name'],
      properties: {
        businessId:     { type: 'number', example: 1 },
        name:           { type: 'string', example: '인천 물류센터' },
        displayName:    { type: 'string', example: '인천 HUB' },
        warehouseCode:  { type: 'string', example: 'WH-ICN-001' },
        dealStatus:     { type: 'string', example: 'ACTIVE' },
        location:       { type: 'string', example: '인천광역시 연수구...' },
        settlementMonth:{ type: 'number', example: 1 },
        settlementPayDay:{ type: 'number', example: 25 },
        settlementAccount:{ type: 'string', example: '신한 110-123-456789' },
      },
    },
  })
  create(@Body() body: any) {
    return this.warehouseService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '창고 정보 수정' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.warehouseService.update(id, body);
  }

  // ─────────────────────────────────────
  // 양식 설정
  // ─────────────────────────────────────

  @Patch(':id/output-format')
  @ApiOperation({ summary: '발주 출력 양식 설정 (창고 발주서 양식)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['format'],
      properties: {
        format:   { type: 'object', example: { '상품코드': 'roubizCode', '상품명': 'name', '수량': 'quantity' } },
        filename: { type: 'string', example: '{date}_{warehouseName}_발주서' },
      },
    },
  })
  setOutputFormat(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.warehouseService.setOutputFormat(id, body);
  }

  @Patch(':id/settlement-format')
  @ApiOperation({ summary: '정산 출력 양식 설정 (창고 발송용)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['format'],
      properties: {
        format:     { type: 'object', example: { '주문번호': 'roubizOrderNo', '출고금액': 'totalCost' } },
        recognizer: { type: 'string', example: '정산번호' },
      },
    },
  })
  setSettlementFormat(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.warehouseService.setSettlementFormat(id, body);
  }

  // ─────────────────────────────────────
  // 재고 현황
  // ─────────────────────────────────────

  @Get('stock/all')
  @ApiOperation({ summary: '전체 창고 재고 현황 (가용재고 포함)' })
  getAllStockStatus() {
    return this.warehouseService.getAllStockStatus();
  }

  @Get(':id/stock')
  @ApiOperation({ summary: '특정 창고 재고 현황' })
  getStockStatus(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getStockStatus(id);
  }

  // ─────────────────────────────────────
  // 재고 이관
  // ─────────────────────────────────────

  @Post('transfer')
  @ApiOperation({ summary: '재고 이관 (창고 → 창고, 가용 재고 기준)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fromWarehouseId', 'toWarehouseId', 'roubizProductId', 'quantity'],
      properties: {
        fromWarehouseId: { type: 'number', example: 1 },
        toWarehouseId:   { type: 'number', example: 2 },
        roubizProductId: { type: 'number', example: 1 },
        quantity:        { type: 'number', example: 50 },
        reason:          { type: 'string', example: '센터 이전' },
      },
    },
  })
  transferStock(@Body() body: any) {
    return this.warehouseService.transferStock(body);
  }

  @Get('transfer/history')
  @ApiOperation({ summary: '재고 이관 이력 조회 (warehouseId 미입력 시 전체)' })
  @ApiQuery({ name: 'warehouseId', required: false, type: Number })
  getTransferHistory(@Query('warehouseId') warehouseId?: string) {
    return this.warehouseService.getTransferHistory(warehouseId ? Number(warehouseId) : undefined);
  }
}
