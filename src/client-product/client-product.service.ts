// src/client-product/client-product.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateClientProductDto } from './dto/create-client-product.dto';

const prisma = new PrismaClient();

@Injectable()
export class ClientProductService {
  
  async create(dto: CreateClientProductDto) {
    const client = await prisma.businessRole.findUnique({
      where: { businessName: dto.clientName },
    });
    if (!client) throw new NotFoundException(`판매처(${dto.clientName}) 없음`);

    // [수정] dto.dbProductCode -> dto.roubizCode
    const product = await prisma.roubizProduct.findUnique({
      where: { roubizCode: dto.roubizCode }, 
    });
    if (!product) throw new NotFoundException(`루비즈 상품코드(${dto.roubizCode}) 없음`);

    const existing = await prisma.clientProductMapping.findFirst({
      where: {
        clientRoleId: client.id,
        clientProductCode: dto.clientProductCode,
        clientOptionName: dto.clientOptionName
      }
    });
    if (existing) throw new BadRequestException('이미 등록된 매핑입니다.');

    return await prisma.clientProductMapping.create({
      data: {
        clientRoleId: client.id,
        roubizProductId: product.id, 
        clientProductCode: dto.clientProductCode,
        clientOptionName: dto.clientOptionName
      }
    });
  }

  async findAll() {
    return await prisma.clientProductMapping.findMany({
      include: { 
        clientRole: true, 
        roubizProduct: true 
      },
      orderBy: { id: 'desc' }
    });
  }

  async remove(id: number) {
    return await prisma.clientProductMapping.delete({ where: { id } });
  }
}