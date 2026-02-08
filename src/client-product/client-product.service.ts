// src/client-product/client-product.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateClientProductDto } from './dto/create-client-product.dto';

const prisma = new PrismaClient();

@Injectable()
export class ClientProductService {
  
  async create(dto: CreateClientProductDto) {
    // 1. 판매처 존재 확인
    const client = await prisma.businessRole.findUnique({
      where: { businessName: dto.clientName },
    });
    if (!client) throw new NotFoundException(`판매처(${dto.clientName}) 없음`);

    // 2. 루비즈 상품 존재 확인
    const product = await prisma.roubizProduct.findUnique({
      where: { roubizCode: dto.roubizCode }, 
    });
    if (!product) throw new NotFoundException(`상품코드(${dto.roubizCode}) 없음`);

    // 3. 중복 매핑 방지
    const existing = await prisma.clientProductMapping.findFirst({
      where: {
        clientRoleId: client.id,
        clientProductCode: dto.clientProductCode,
        clientOptionName: dto.clientOptionName
      }
    });
    if (existing) throw new BadRequestException('이미 등록된 매핑입니다.');

    // 4. 저장 (roubizProductId 사용)
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