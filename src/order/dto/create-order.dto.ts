// src/order/dto/create-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: '오픈마켓', description: '판매처 이름 (오픈마켓, 자사몰 등)' })
  channelName: string;

  @ApiProperty({ example: '20260207-0001', description: '주문번호' })
  orderNo: string;

  @ApiProperty({ example: 'R10001', description: '상품코드 (옵션코드)' })
  productCode: string;

  @ApiProperty({ example: 2, description: '주문수량' })
  quantity: number;

  @ApiProperty({ example: 30000, description: '결제금액' })
  price: number;
}