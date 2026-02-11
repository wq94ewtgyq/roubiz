import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('창고 재고 (Inventory)')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // [1] 재고 조정 (입고 / 실사 / 예외 출고)
  @Post('adjust')
  @ApiOperation({ summary: '재고 조정 (양수: 입고 / 음수: 예외 출고)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['warehouseId', 'roubizProductId', 'quantity', 'reason'],
      properties: {
        warehouseId:     { type: 'number', example: 1 },
        roubizProductId: { type: 'number', example: 1 },
        quantity:        { type: 'number', example: 100,  description: '양수=입고, 음수=출고' },
        reason:          { type: 'string', example: '초기 입고' },
      },
    },
  })
  adjust(@Body() body: { warehouseId: number; roubizProductId: number; quantity: number; reason: string }) {
    return this.inventoryService.adjustStock(body);
  }

  // [2] 특정 상품 창고별 재고 조회
  @Get('product/:roubizProductId')
  @ApiOperation({ summary: '특정 상품의 창고별 재고 현황 조회' })
  getStockByProduct(@Param('roubizProductId', ParseIntPipe) roubizProductId: number) {
    return this.inventoryService.getStockByProduct(roubizProductId);
  }
}
