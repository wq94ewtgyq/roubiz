import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SupplierProductService } from './supplier-product.service';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto'; // ★ 올바른 경로
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('공급사 상품(매입단가)')
@Controller('supplier-product')
export class SupplierProductController {
  constructor(private readonly supplierProductService: SupplierProductService) {}

  @Post()
  create(@Body() createSupplierProductDto: CreateSupplierProductDto) {
    return this.supplierProductService.create(createSupplierProductDto);
  }

  @Get()
  findAll() {
    return this.supplierProductService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierProductDto: UpdateSupplierProductDto) {
    return this.supplierProductService.update(+id, updateSupplierProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supplierProductService.remove(+id);
  }
}