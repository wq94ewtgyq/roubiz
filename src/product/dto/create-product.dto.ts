// src/product/dto/create-product.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: '루비즈 상품코드', example: 'R100081' })
  roubizCode: string; // [확정] roubizCode

  @ApiProperty({ description: '상품명', example: '블랙마카 100포' })
  name: string;

  @ApiProperty({ description: '매입 원가', example: 15000 })
  purchaseCost: number;

  @ApiProperty({ description: '세트 상품 여부', example: false, required: false })
  isSet?: boolean; // [확정] isSet
}