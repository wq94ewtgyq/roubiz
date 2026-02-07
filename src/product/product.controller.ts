// src/product/product.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiProperty } from '@nestjs/swagger'; // 스웨거용 명찰 도구

// [1] 데이터 명세서(DTO) 만들기: 스웨거가 이걸 보고 예시를 만들어줍니다.
class CreateProductDto {
  @ApiProperty({ example: '루트바이 블랙마카 100포', description: '상품명' })
  name: string;

  @ApiProperty({ example: 'R10001', description: 'DB 관리코드' })
  dbCode: string;

  @ApiProperty({ example: 15000, description: '매입원가', required: false })
  purchaseCost?: number;
}

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  // [2] Body에 위에서 만든 명세서(CreateProductDto)를 적용합니다.
  create(@Body() body: CreateProductDto) {
    return this.productService.create(body);
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.productService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}