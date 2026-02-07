import { PartialType } from '@nestjs/swagger';
import { CreateClientProductDto } from './create-client-product.dto';

export class UpdateClientProductDto extends PartialType(CreateClientProductDto) {}