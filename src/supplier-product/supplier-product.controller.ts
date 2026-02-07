// src/supplier-product/supplier-product.controller.ts
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { SupplierProductService, CreateSupplierProductDto } from './supplier-product.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Supplier Product (공급처 상품 매핑)')
@Controller('supplier-product')
export class SupplierProductController {
  constructor(private readonly service: SupplierProductService) {}

  @Post()
  @ApiOperation({ summary: '공급처 상품 매핑 등록' })
  create(@Body() dto: CreateSupplierProductDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '전체 공급처 상품 매핑 조회' })
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  @ApiOperation({ summary: '매핑 삭제' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}