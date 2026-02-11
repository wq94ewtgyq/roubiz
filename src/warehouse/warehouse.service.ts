import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class WarehouseService {

  async findAll() {
    return prisma.warehouse.findMany({
      include: {
        business: { select: { id: true, businessName: true, displayName: true } },
        _count:   { select: { stocks: true, executions: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const wh = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        business: true,
        stocks:   { include: { roubizProduct: true } },
      },
    });
    if (!wh) throw new NotFoundException(`창고(ID:${id})를 찾을 수 없습니다.`);
    return wh;
  }

  async create(dto: Record<string, any>) {
    return prisma.warehouse.create({ data: dto as any });
  }

  async update(id: number, dto: Record<string, any>) {
    await this.findOne(id);
    return prisma.warehouse.update({ where: { id }, data: dto });
  }

  // ── 발주 출력 양식 설정 ──

  async setOutputFormat(id: number, dto: { format: Record<string, string>; filename?: string }) {
    await this.findOne(id);
    return prisma.warehouse.update({
      where: { id },
      data:  {
        outputFormat:  JSON.stringify(dto.format),
        outputFilename:dto.filename,
      },
    });
  }

  // ── 정산 출력 양식 설정 ──

  async setSettlementFormat(id: number, dto: { format: Record<string, string>; recognizer?: string }) {
    await this.findOne(id);
    return prisma.warehouse.update({
      where: { id },
      data:  {
        settlementOutputFormat:     JSON.stringify(dto.format),
        settlementOutputRecognizer: dto.recognizer,
      },
    });
  }

  // ── 재고 현황 조회 ──

  async getStockStatus(warehouseId: number) {
    await this.findOne(warehouseId);
    return prisma.warehouseStock.findMany({
      where:   { warehouseId },
      include: { roubizProduct: true },
      orderBy: { roubizProduct: { roubizCode: 'asc' } },
    });
  }

  // ── 전체 창고 재고 현황 ──

  async getAllStockStatus() {
    const stocks = await prisma.warehouseStock.findMany({
      include: {
        warehouse:    { select: { id: true, name: true, warehouseCode: true } },
        roubizProduct:{ select: { id: true, roubizCode: true, name: true, optionName: true } },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { roubizProduct: { roubizCode: 'asc' } }],
    });

    return stocks.map(s => ({
      warehouseId:  s.warehouse.id,
      warehouseName:s.warehouse.name,
      warehouseCode:s.warehouse.warehouseCode,
      roubizCode:   s.roubizProduct.roubizCode,
      productName:  s.roubizProduct.name,
      optionName:   s.roubizProduct.optionName,
      quantity:     s.quantity,
      allocated:    s.allocated,
      available:    s.quantity - s.allocated,
    }));
  }

  // ── 재고 이관 ──

  async transferStock(dto: {
    fromWarehouseId: number;
    toWarehouseId:   number;
    roubizProductId: number;
    quantity:        number;
    reason?:         string;
  }) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('출발 창고와 도착 창고가 동일합니다.');
    }

    const sourceStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouse_product_stock: {
          warehouseId:     dto.fromWarehouseId,
          roubizProductId: dto.roubizProductId,
        },
      },
    });

    if (!sourceStock) throw new NotFoundException('출발 창고에 해당 상품 재고가 없습니다.');

    const available = sourceStock.quantity - sourceStock.allocated;
    if (available < dto.quantity) {
      throw new BadRequestException(
        `이관 가능 재고 부족. (요청: ${dto.quantity}, 가용: ${available})`,
      );
    }

    await prisma.$transaction(async (tx) => {
      // 출발 창고 재고 차감
      await tx.warehouseStock.update({
        where: { id: sourceStock.id },
        data:  { quantity: { decrement: dto.quantity } },
      });

      // 도착 창고 재고 증가 (없으면 생성)
      await tx.warehouseStock.upsert({
        where: {
          warehouse_product_stock: {
            warehouseId:     dto.toWarehouseId,
            roubizProductId: dto.roubizProductId,
          },
        },
        update: { quantity: { increment: dto.quantity } },
        create: {
          warehouseId:     dto.toWarehouseId,
          roubizProductId: dto.roubizProductId,
          quantity:        dto.quantity,
          allocated:       0,
        },
      });

      // 이관 이력 기록
      await tx.stockTransfer.create({
        data: {
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId:   dto.toWarehouseId,
          roubizProductId: dto.roubizProductId,
          quantity:        dto.quantity,
          reason:          dto.reason,
        },
      });
    });

    return { message: `${dto.quantity}개 이관 완료` };
  }

  // ── 이관 이력 조회 ──

  async getTransferHistory(warehouseId?: number) {
    return prisma.stockTransfer.findMany({
      where: warehouseId
        ? { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] }
        : undefined,
      include: {
        fromWarehouse: { select: { name: true } },
        toWarehouse:   { select: { name: true } },
      },
      orderBy: { transferredAt: 'desc' },
    });
  }
}
