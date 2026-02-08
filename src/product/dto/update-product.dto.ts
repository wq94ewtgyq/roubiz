// src/product/dto/update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  // CreateProductDto의 roubizCode, name, purchaseCost, isSet을 선택적으로 상속받습니다.
  // 추가적으로 필요한 상태값만 정의합니다.
  status?: string; 
}