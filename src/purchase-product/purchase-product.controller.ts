// src/purchase-product/purchase-product.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { PurchaseProductService } from './purchase-product.service';
import { ApiTags, ApiProperty } from '@nestjs/swagger';

class CreatePurchaseProductDto {
  @ApiProperty({ example: '건강나라(주)', description: '공급처 이름' })
  supplierName: string;

  @ApiProperty({ example: 'R10001', description: '우리 상품 코드' })
  dbProductCode: string;

  @ApiProperty({ example: 5000, description: '매입 단가(Cost)' })
  cost: number;

  @ApiProperty({ example: 'SUP_BM_001', description: '공급처 상품코드(선택)', required: false })
  supplierCode?: string;
}

@ApiTags('Purchase Product (매입단가 관리)')
@Controller('purchase-product')
export class PurchaseProductController {
  constructor(private readonly purchaseProductService: PurchaseProductService) {}

  @Post()
  create(@Body() dto: CreatePurchaseProductDto) {
    return this.purchaseProductService.create(dto);
  }

  @Get()
  findAll() {
    return this.purchaseProductService.findAll();
  }
}