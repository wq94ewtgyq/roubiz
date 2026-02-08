// src/client-product/dto/create-client-product.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientProductDto {
  @ApiProperty({ example: '쿠팡', description: '판매처(Client) 이름' })
  clientName: string;

  @ApiProperty({ example: 'R100081', description: '루비즈 기준 상품 코드' })
  roubizCode: string; // [확정] dbProductCode -> roubizCode

  @ApiProperty({ example: 'A001', description: '판매처 측 상품코드' })
  clientProductCode: string;

  @ApiProperty({ example: '옵션없음', description: '판매처 측 옵션명' })
  clientOptionName: string;
}