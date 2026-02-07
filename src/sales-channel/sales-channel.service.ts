// src/sales-channel/sales-channel.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient, SalesGroup } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SalesChannelService {
  // 조회
  async findAll() {
    return await prisma.salesChannelType.findMany();
  }

  // 생성
  async create(name: string, group: SalesGroup, description?: string) {
    return await prisma.salesChannelType.create({
      data: { name, group, description },
    });
  }

  // 수정
  async update(id: number, group: SalesGroup) {
    return await prisma.salesChannelType.update({
      where: { id },
      data: { group },
    });
  }

  // 삭제
  async remove(id: number) {
    return await prisma.salesChannelType.delete({
      where: { id },
    });
  }
}