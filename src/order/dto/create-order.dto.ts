// src/order/dto/create-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: '오픈마켓', description: '판매처 이름' })
  channelName: string;

  @ApiProperty({ example: '20260207-0001', description: '주문번호' })
  orderNo: string;

  @ApiProperty({ example: 'A001', description: '판매처 상품코드' })
  productCode: string;

  // [NEW] 옵션명 추가 (필수)
  @ApiProperty({ example: '기본 옵션', description: '판매처 옵션명 (매핑 기준)' })
  optionName: string;

  @ApiProperty({ example: 2, description: '주문수량' })
  quantity: number;

  @ApiProperty({ example: 30000, description: '결제금액' })
  price: number;
}