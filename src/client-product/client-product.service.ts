// src/client-product/client-product.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateClientProductDto } from './dto/create-client-product.dto';

const prisma = new PrismaClient();

@Injectable()
export class ClientProductService {
  
  async create(dto: CreateClientProductDto) {
    // [변경] 판매처(SalesChannel) 확인
    // 기존: findUnique(businessName) -> 변경: findFirst(name)
    const channel = await prisma.salesChannel.findFirst({
      where: { name: dto.clientName },
    });
    if (!channel) throw new NotFoundException(`판매처(${dto.clientName})를 찾을 수 없습니다. DB에 등록되어 있는지 확인해주세요.`);

    // 2. 루비즈 상품 존재 확인
    const product = await prisma.roubizProduct.findUnique({
      where: { roubizCode: dto.roubizCode }, 
    });
    if (!product) throw new NotFoundException(`상품코드(${dto.roubizCode}) 없음`);

    // 3. 중복 매핑 방지
    // [변경] clientRoleId -> salesChannelId
    const existing = await prisma.clientProductMapping.findFirst({
      where: {
        salesChannelId: channel.id,
        clientProductCode: dto.clientProductCode,
        clientOptionName: dto.clientOptionName
      }
    });
    if (existing) throw new BadRequestException('이미 등록된 매핑입니다.');

    // 4. 저장
    // [변경] clientRoleId -> salesChannelId
    return await prisma.clientProductMapping.create({
      data: {
        salesChannelId: channel.id,
        roubizProductId: product.id, 
        clientProductCode: dto.clientProductCode,
        clientOptionName: dto.clientOptionName
      }
    });
  }

  async findAll() {
    return await prisma.clientProductMapping.findMany({
      include: { 
        salesChannel: true, // [변경] clientRole -> salesChannel
        roubizProduct: true 
      },
      orderBy: { id: 'desc' }
    });
  }

  async remove(id: number) {
    return await prisma.clientProductMapping.delete({ where: { id } });
  }
}