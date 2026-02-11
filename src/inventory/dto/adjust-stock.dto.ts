import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ description: '창고 ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  warehouseId: number;

  @ApiProperty({ description: '루비즈 상품 ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  roubizProductId: number;

  @ApiProperty({ description: '조정 수량 (양수: 입고 / 음수: 출고)', example: 100 })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: '조정 사유', example: '초기 재고 세팅' })
  @IsString()
  @IsOptional()
  reason?: string;
}