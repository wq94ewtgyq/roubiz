// src/purchase-product/purchase-product.controller.ts
import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { PurchaseProductService } from './purchase-product.service';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseProductDto {
  @ApiProperty({ example: '건강나라(주)', description: '공급처 이름' })
  purchaseName: string;

  @ApiProperty({ example: 'A001', description: '우리 상품 코드 (DB Code)' })
  dbProductCode: string; // [복구완료] 다시 dbProductCode로 돌아왔습니다.

  @ApiProperty({ example: 5000, description: '매입 단가(Cost)' })
  costPrice: number;     // (cost -> costPrice는 유지하는 게 좋습니다)

  @ApiProperty({ example: 'SUP_BM_001', description: '공급처 상품코드(선택)', required: false })
  purchaseProductCode?: string;

  @ApiProperty({ example: '활력 블랙마카', description: '공급처 상품명(선택)', required: false })
  purchaseProductName?: string;
}

@ApiTags('Purchase Product (매입단가 관리)')
@Controller('purchase-product')
export class PurchaseProductController {
  constructor(private readonly purchaseProductService: PurchaseProductService) {}

  @Post()
  @ApiOperation({ summary: '매입 상품/단가 등록' })
  create(@Body() dto: CreatePurchaseProductDto) {
    return this.purchaseProductService.create(dto);
  }

  @Get()
  findAll() {
    return this.purchaseProductService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseProductService.remove(+id);
  }
}