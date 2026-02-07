import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { ClientProductService } from './client-product.service';
import { CreateClientProductDto } from './dto/create-client-product.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Client Product (판매처 상품 매핑)')
@Controller('client-product')
export class ClientProductController {
  constructor(private readonly service: ClientProductService) {}

  @Post()
  @ApiOperation({ summary: '판매처 상품 매핑 등록' })
  create(@Body() dto: CreateClientProductDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}