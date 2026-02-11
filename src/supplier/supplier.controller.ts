import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('매입처 관리 (Supplier)')
@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  // ─────────────────────────────────────
  // 매입처 CRUD
  // ─────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '매입처 전체 목록 조회' })
  findAll() {
    return this.supplierService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '매입처 상세 조회 (공급상품 포함)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '매입처 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['businessId', 'name'],
      properties: {
        businessId:          { type: 'number', example: 1 },
        name:                { type: 'string', example: '정관장' },
        displayName:         { type: 'string', example: '정관장 유통' },
        dealStatus:          { type: 'string', example: 'ACTIVE', description: 'ACTIVE | INACTIVE | PENDING' },
        channelType:         { type: 'string', example: '위탁' },
        settlementType:      { type: 'string', example: 'SUPPLY' },
        settlementStartDay:  { type: 'number', example: 1 },
        settlementEndDay:    { type: 'number', example: 31 },
        settlementMonth:     { type: 'number', example: 1 },
        settlementPayDay:    { type: 'number', example: 20 },
        settlementAccount:   { type: 'string', example: '국민 012-345-678901' },
      },
    },
  })
  create(@Body() body: any) {
    return this.supplierService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '매입처 정보 수정' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.supplierService.update(id, body);
  }

  // ─────────────────────────────────────
  // 양식 설정
  // ─────────────────────────────────────

  @Patch(':id/order-output-format')
  @ApiOperation({ summary: '발주 출력 양식 설정 (매입처 발주서 양식)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['format'],
      properties: {
        format:   { type: 'object', example: { '상품코드': 'roubizCode', '상품명': 'name', '수량': 'quantity' } },
        filename: { type: 'string', example: '{date}_{supplierName}_발주서', description: '파일명 구조' },
      },
    },
  })
  setOrderOutputFormat(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.supplierService.setOrderOutputFormat(id, body);
  }

  @Patch(':id/settlement-format')
  @ApiOperation({ summary: '정산 출력 양식 설정 (매입처 발송용)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['format'],
      properties: {
        format:     { type: 'object', example: { '주문번호': 'roubizOrderNo', '매입금액': 'totalCost' } },
        recognizer: { type: 'string', example: '정산번호' },
      },
    },
  })
  setSettlementFormat(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.supplierService.setSettlementFormat(id, body);
  }

  // ─────────────────────────────────────
  // 공급사 관련 조회
  // ─────────────────────────────────────

  @Get(':id/products')
  @ApiOperation({ summary: '공급 상품 목록 조회' })
  getSupplierProducts(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.getSupplierProducts(id);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: '발주 대기 실행 건 조회 (발주서 출력 기준 데이터)' })
  getPendingExecutions(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.getPendingExecutions(id);
  }
}
