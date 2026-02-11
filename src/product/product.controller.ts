import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('상품 관리 (Product)')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ─────────────────────────────────────
  // 매입상품 (R#####)
  // ─────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '매입상품 목록 조회 (상태 / 카테고리 / 브랜드 필터)' })
  @ApiQuery({ name: 'status',   required: false, example: 'ACTIVE' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'brand',    required: false })
  findAll(
    @Query('status')   status?:   string,
    @Query('category') category?: string,
    @Query('brand')    brand?:    string,
  ) {
    return this.productService.findAll({ status, category, brand });
  }

  @Get(':id')
  @ApiOperation({ summary: '매입상품 상세 조회 (재고 / 공급사 / 매핑 포함)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '매입상품 등록 (roubizCode 미입력 시 자동 채번 R#####)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        roubizCode:      { type: 'string',  example: 'R00001', description: '미입력 시 자동 채번' },
        name:            { type: 'string',  example: '홍삼정' },
        optionName:      { type: 'string',  example: '30포' },
        productType:     { type: 'string',  example: 'CONSIGNMENT', description: 'CONSIGNMENT(위탁) | PURCHASE(사입)' },
        category:        { type: 'string',  example: '건강식품' },
        subCategory:     { type: 'string',  example: '홍삼' },
        item:            { type: 'string',  example: '홍삼정' },
        brand:           { type: 'string',  example: '정관장' },
        standardCost:    { type: 'number',  example: 15000 },
        shippingFeeType: { type: 'string',  example: 'FREE',  description: 'FREE | CONDITIONAL | PAID' },
        shippingFee:     { type: 'number',  example: 3000 },
        boxQuantity:     { type: 'number',  example: 10 },
        remoteAreaFee:   { type: 'number',  example: 3000 },
        returnCost:      { type: 'number',  example: 5000 },
        isSeasonal:      { type: 'boolean', example: false },
        seasonType:      { type: 'string',  example: 'HOLIDAY', description: 'HOLIDAY | SUMMER | WINTER' },
      },
    },
  })
  create(@Body() body: any) {
    return this.productService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '매입상품 정보 수정' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.productService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '매입상품 삭제' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }

  // ─────────────────────────────────────
  // 세트상품 (SR#####)
  // ─────────────────────────────────────

  @Get('set/list')
  @ApiOperation({ summary: '세트상품 전체 목록 조회' })
  findAllSetProducts() {
    return this.productService.findAllSetProducts();
  }

  @Get('set/:id')
  @ApiOperation({ summary: '세트상품 상세 조회' })
  findOneSetProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOneSetProduct(id);
  }

  @Post('set')
  @ApiOperation({ summary: '세트상품 등록 (setCode 미입력 시 자동 채번 SR#####, totalCost 자동계산)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['setType', 'name', 'items'],
      properties: {
        setCode:     { type: 'string', example: 'SR00001', description: '미입력 시 자동 채번' },
        setType:     { type: 'string', example: 'COMBINED', description: 'QUANTITY(수량세트) | COMBINED(결합세트)' },
        name:        { type: 'string', example: '홍삼정 선물세트' },
        brand:       { type: 'string', example: '정관장' },
        shippingFee: { type: 'number', example: 3000 },
        boxQuantity: { type: 'number', example: 5 },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              roubizProductId: { type: 'number', example: 1 },
              quantity:        { type: 'number', example: 2 },
            },
          },
          example: [{ roubizProductId: 1, quantity: 2 }, { roubizProductId: 2, quantity: 1 }],
        },
      },
    },
  })
  createSetProduct(@Body() body: any) {
    return this.productService.createSetProduct(body);
  }

  @Patch('set/:id')
  @ApiOperation({ summary: '세트상품 정보 수정 (구성품 제외)' })
  updateSetProduct(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.productService.updateSetProduct(id, body);
  }
}
