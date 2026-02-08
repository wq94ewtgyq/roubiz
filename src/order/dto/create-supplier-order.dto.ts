// src/order/dto/create-supplier-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierOrderDto {
  @ApiProperty({ description: '발주 대상 RoubizOrder ID 리스트', example: [1, 2, 3] })
  roubizOrderIds: number[];
}