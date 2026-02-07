import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseProductDto } from './create-purchase-product.dto';

export class UpdatePurchaseProductDto extends PartialType(CreatePurchaseProductDto) {}
