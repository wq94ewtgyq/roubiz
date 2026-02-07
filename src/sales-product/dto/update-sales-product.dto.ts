import { PartialType } from '@nestjs/swagger';
import { CreateSalesProductDto } from './create-sales-product.dto';

export class UpdateSalesProductDto extends PartialType(CreateSalesProductDto) {}
