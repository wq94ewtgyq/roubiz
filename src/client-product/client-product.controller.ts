import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ClientProductService } from './client-product.service';
import { CreateClientProductDto } from './dto/create-client-product.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Client Product (상품 매핑 관리)')
@Controller('client-product')
export class ClientProductController {
  constructor(private readonly service: ClientProductService) {}

  @Post()
  @ApiOperation({ summary: '매핑 수동 등록' })
  create(@Body() dto: CreateClientProductDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '전체 매핑 목록 조회' })
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  @ApiOperation({ summary: '매핑 삭제' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}