// src/product/dto/update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  // CreateProductDto의 모든 필드를 선택적(Optional)으로 상속받습니다.
  status?: string; 
}