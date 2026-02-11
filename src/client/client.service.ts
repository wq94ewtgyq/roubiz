import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ClientService {

  async findAll() {
    return prisma.client.findMany({
      include: {
        business: { select: { id: true, businessName: true, displayName: true } },
        _count:   { select: { orders: true, mappings: true, clientProducts: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        business:       true,
        clientProducts: true,
        mappings:       { include: { roubizProduct: true } },
      },
    });
    if (!client) throw new NotFoundException(`판매처(ID:${id})를 찾을 수 없습니다.`);
    return client;
  }

  async create(dto: Record<string, any>) {
    return prisma.client.create({ data: dto as any });
  }

  async update(id: number, dto: Record<string, any>) {
    await this.findOne(id);
    return prisma.client.update({ where: { id }, data: dto });
  }

  // ── 양식 설정 메서드 ──

  async setWaybillFormat(id: number, format: Record<string, string>) {
    await this.findOne(id);
    return prisma.client.update({
      where: { id },
      data:  { waybillFormat: JSON.stringify(format) },
    });
  }

  async setOrderUploadFormat(id: number, dto: { format: Record<string, string>; recognizer?: string }) {
    await this.findOne(id);
    return prisma.client.update({
      where: { id },
      data:  {
        orderUploadFormat:     JSON.stringify(dto.format),
        orderUploadRecognizer: dto.recognizer,
      },
    });
  }

  async setSettlementFormat(id: number, dto: { format: Record<string, string>; recognizer?: string }) {
    await this.findOne(id);
    return prisma.client.update({
      where: { id },
      data:  {
        settlementOutputFormat:     JSON.stringify(dto.format),
        settlementOutputRecognizer: dto.recognizer,
      },
    });
  }

  // ── 매출상품(ClientProduct) CRUD ──

  async createClientProduct(clientId: number, dto: Record<string, any>) {
    await this.findOne(clientId);
    return prisma.clientProduct.create({ data: { clientId, ...dto } as any });
  }

  async getClientProducts(clientId: number) {
    await this.findOne(clientId);
    return prisma.clientProduct.findMany({ where: { clientId } });
  }

  async updateClientProduct(productId: number, dto: Record<string, any>) {
    return prisma.clientProduct.update({ where: { id: productId }, data: dto });
  }

  async remove(id: number) {
    return prisma.client.delete({ where: { id } });
  }
}
