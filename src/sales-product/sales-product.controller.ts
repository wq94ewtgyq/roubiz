// src/sales-product/sales-product.controller.ts
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { SalesProductService } from './sales-product.service';
import { ApiTags, ApiProperty } from '@nestjs/swagger';

// [DTO] 스웨거용 명세서
class CreateSalesProductDto {
  @ApiProperty({ example: 1, description: '판매처(BusinessRole) ID' })
  channelId: number;

  @ApiProperty({ example: 'A001_COUPANG', description: '판매처 상품코드' })
  salesCode: string;

  @ApiProperty({ example: '기본 옵션', description: '옵션명' })
  salesOption: string;

  @ApiProperty({ example: 'R10001', description: '매핑할 우리 마스터 코드' })
  dbProductCode: string;
}

@ApiTags('Sales Product (매출상품 매핑)')
@Controller('sales-product')
export class SalesProductController {
  constructor(private readonly salesProductService: SalesProductService) {}

  @Post()
  create(@Body() dto: CreateSalesProductDto) {
    return this.salesProductService.create(dto);
  }

  @Get()
  findAll() {
    return this.salesProductService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesProductService.remove(+id);
  }
}