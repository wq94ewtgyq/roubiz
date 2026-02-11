import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SupplierService {

  async findAll() {
    return prisma.supplier.findMany({
      include: {
        business: { select: { id: true, businessName: true, displayName: true } },
        _count:   { select: { products: true, executions: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        business:  true,
        products:  { include: { roubizProduct: true } },
      },
    });
    if (!supplier) throw new NotFoundException(`매입처(ID:${id})를 찾을 수 없습니다.`);
    return supplier;
  }

  async create(dto: Record<string, any>) {
    return prisma.supplier.create({ data: dto as any });
  }

  async update(id: number, dto: Record<string, any>) {
    await this.findOne(id);
    return prisma.supplier.update({ where: { id }, data: dto });
  }

  // ── 발주 출력 양식 설정 ──

  async setOrderOutputFormat(id: number, dto: { format: Record<string, string>; filename?: string }) {
    await this.findOne(id);
    return prisma.supplier.update({
      where: { id },
      data:  {
        orderOutputFormat:  JSON.stringify(dto.format),
        orderOutputFilename:dto.filename,
      },
    });
  }

  // ── 정산 출력 양식 설정 ──

  async setSettlementFormat(id: number, dto: { format: Record<string, string>; recognizer?: string }) {
    await this.findOne(id);
    return prisma.supplier.update({
      where: { id },
      data:  {
        settlementOutputFormat:     JSON.stringify(dto.format),
        settlementOutputRecognizer: dto.recognizer,
      },
    });
  }

  // ── 공급사-상품 연결 조회 ──

  async getSupplierProducts(supplierId: number) {
    await this.findOne(supplierId);
    return prisma.supplierProduct.findMany({
      where:   { supplierId },
      include: { roubizProduct: true },
    });
  }

  // ── 발주 가능 실행 건 조회 (INSTRUCTED 상태) ──

  async getPendingExecutions(supplierId: number) {
    return prisma.orderExecution.findMany({
      where: {
        supplierId,
        status: { in: ['INSTRUCTED', 'READY'] },
        executionType: 'SUPPLIER',
      },
      include: {
        order: {
          include: { roubizProduct: true, clientOrder: { include: { client: true } } },
        },
      },
      orderBy: { id: 'asc' },
    });
  }
}
