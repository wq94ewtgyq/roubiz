import { IsString, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientProductDto {
  @ApiProperty({ description: 'Client(판매처) 명칭', example: '쿠팡' })
  @IsString()
  @IsNotEmpty()
  clientName: string; // 기존 channelName -> clientName 변경

  @ApiProperty({ description: 'Client 상품코드', example: '12345678' })
  @IsString()
  @IsNotEmpty()
  clientProductCode: string;

  @ApiProperty({ description: 'Client 옵션명', example: '기본' })
  @IsString()
  @IsNotEmpty()
  clientOptionName: string;

  @ApiProperty({ description: '매핑할 루비즈 상품 ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  roubizProductId: number; // ★ 이 부분이 누락되어 에러가 났었습니다.
}