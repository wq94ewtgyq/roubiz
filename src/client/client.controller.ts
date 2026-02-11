import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ClientService } from './client.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('판매처 관리 (Client)')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // ─────────────────────────────────────
  // 판매처 CRUD
  // ─────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '판매처 전체 목록 조회' })
  findAll() {
    return this.clientService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '판매처 상세 조회 (매출상품 + 매핑 포함)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '판매처 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['businessId', 'name'],
      properties: {
        businessId:          { type: 'number', example: 1 },
        name:                { type: 'string', example: '쿠팡' },
        displayName:         { type: 'string', example: '쿠팡 로켓그로스' },
        dealStatus:          { type: 'string', example: 'ACTIVE',     description: 'ACTIVE | INACTIVE | PENDING' },
        channelType:         { type: 'string', example: '쇼핑몰',     description: '쇼핑몰 | 특판 | 밴더' },
        salesEntity:         { type: 'string', example: '루비즈 영업1팀' },
        settlementType:      { type: 'string', example: 'COMMISSION', description: 'SUPPLY(공급가) | COMMISSION(수수료)' },
        settlementStartDay:  { type: 'number', example: 1  },
        settlementEndDay:    { type: 'number', example: 31 },
        settlementMonth:     { type: 'number', example: 1,  description: 'N개월 후 정산' },
        settlementPayDay:    { type: 'number', example: 15, description: '매월 N일 지급' },
        accountHolder:       { type: 'string', example: '(주)루비즈' },
        settlementAccount:   { type: 'string', example: '신한 110-123-456789' },
      },
    },
  })
  create(@Body() body: any) {
    return this.clientService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '판매처 정보 수정' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.clientService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '판매처 삭제' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.remove(id);
  }

  // ─────────────────────────────────────
  // 양식 설정
  // ─────────────────────────────────────

  @Patch(':id/waybill-format')
  @ApiOperation({ summary: '운송장 출력 양식 설정 (Key: 헤더명, Value: 데이터 경로)' })
  @ApiBody({
    schema: {
      type: 'object',
      example: { '주문번호': 'clientOrder.clientOrderNo', '택배사': 'carrier.name', '송장번호': 'trackingNumber' },
    },
  })
  setWaybillFormat(@Param('id', ParseIntPipe) id: number, @Body() format: Record<string, string>) {
    return this.clientService.setWaybillFormat(id, format);
  }

  @Patch(':id/order-upload-format')
  @ApiOperation({ summary: '수주 업로드 양식 설정 (주문 엑셀 컬럼 매핑)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['format'],
      properties: {
        format:     { type: 'object', example: { '주문번호': '주문번호', '상품코드': '상품코드' } },
        recognizer: { type: 'string', example: '주문번호', description: '파일 식별에 사용할 컬럼명' },
      },
    },
  })
  setOrderUploadFormat(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.clientService.setOrderUploadFormat(id, body);
  }

  @Patch(':id/settlement-format')
  @ApiOperation({ summary: '정산 출력 양식 설정 (거래처 발송용)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['format'],
      properties: {
        format:     { type: 'object', example: { '주문번호': 'roubizOrderNo', '판매금액': 'salesPrice' } },
        recognizer: { type: 'string', example: '정산번호' },
      },
    },
  })
  setSettlementFormat(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.clientService.setSettlementFormat(id, body);
  }

  // ─────────────────────────────────────
  // 매출상품 (ClientProduct)
  // ─────────────────────────────────────

  @Get(':id/products')
  @ApiOperation({ summary: '매출상품 목록 조회' })
  getClientProducts(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.getClientProducts(id);
  }

  @Post(':id/products')
  @ApiOperation({ summary: '매출상품 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['clientProductCode', 'productName'],
      properties: {
        clientProductCode: { type: 'string', example: 'CP-001' },
        productName:       { type: 'string', example: '홍삼정 30포' },
        optionName:        { type: 'string', example: '30포' },
        salesPrice:        { type: 'number', example: 39000 },
        commissionRate:    { type: 'number', example: 10.5, description: '수수료율 (%)' },
        shippingFeeType:   { type: 'string', example: 'FREE',  description: 'FREE | CONDITIONAL | PAID' },
        taxType:           { type: 'string', example: 'TAXABLE', description: 'TAXABLE | TAX_EXEMPT' },
      },
    },
  })
  createClientProduct(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.clientService.createClientProduct(id, body);
  }

  @Patch('products/:productId')
  @ApiOperation({ summary: '매출상품 수정' })
  updateClientProduct(@Param('productId', ParseIntPipe) productId: number, @Body() body: any) {
    return this.clientService.updateClientProduct(productId, body);
  }
}
