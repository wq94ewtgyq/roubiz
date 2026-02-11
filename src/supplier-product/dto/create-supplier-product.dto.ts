import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierProductDto {
  @ApiProperty({ example: '김씨공장', description: '공급사명' })
  supplierName: string;

  @ApiProperty({ example: 'P001', description: '루트바이 상품코드' })
  roubizCode: string;

  @ApiProperty({ example: 4500, description: '매입단가' })
  costPrice: number;

  @ApiProperty({ example: true, description: '주거래처 여부', required: false })
  isPrimary?: boolean;
}