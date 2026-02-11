import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'P001', description: '루트바이 상품코드' })
  roubizCode: string;

  @ApiProperty({ example: '홍삼정', description: '상품명' })
  name: string;

  @ApiProperty({ example: 5000, description: '표준원가', required: false })
  standardCost?: number;
}