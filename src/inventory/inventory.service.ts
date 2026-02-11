import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class InventoryService {

  // ─────────────────────────────────────
  // 주문 흐름 내부 메서드 (order.service 에서 호출)
  // ─────────────────────────────────────

  // [1] 재고 할당 (Allocate): 주문 확정 시 "찜"
  async allocateStock(warehouseId: number, roubizProductId: number, quantity: number) {
    return prisma.$transaction(async (tx) => {
      const stock = await tx.warehouseStock.findUnique({
        where: { warehouse_product_stock: { warehouseId, roubizProductId } },
      });

      if (!stock) {
        throw new BadRequestException(`창고(ID:${warehouseId})에 해당 상품 재고가 없습니다.`);
      }

      const available = stock.quantity - stock.allocated;
      if (available < quantity) {
        throw new BadRequestException(`재고 부족! (요청: ${quantity}, 가용: ${available})`);
      }

      return tx.warehouseStock.update({
        where: { id: stock.id },
        data:  { allocated: { increment: quantity } },
      });
    });
  }

  // [2] 재고 할당 해제 (Release): 주문 보류/취소 시
  async releaseStock(warehouseId: number, roubizProductId: number, quantity: number) {
    return prisma.warehouseStock.update({
      where: { warehouse_product_stock: { warehouseId, roubizProductId } },
      data:  { allocated: { decrement: quantity } },
    });
  }

  // [3] 재고 실출고 (Ship): 운송장 등록 시
  async shipStock(warehouseId: number, roubizProductId: number, quantity: number) {
    return prisma.warehouseStock.update({
      where: { warehouse_product_stock: { warehouseId, roubizProductId } },
      data:  {
        quantity:  { decrement: quantity },
        allocated: { decrement: quantity },
      },
    });
  }

  // ─────────────────────────────────────
  // API 노출 메서드
  // ─────────────────────────────────────

  // [4] 재고 조정 (입고 / 실사 / 예외 출고)
  async adjustStock(params: {
    warehouseId:     number;
    roubizProductId: number;
    quantity:        number;  // 양수 = 입고, 음수 = 출고
    reason:          string;
  }) {
    const stock = await prisma.warehouseStock.findUnique({
      where: { warehouse_product_stock: { warehouseId: params.warehouseId, roubizProductId: params.roubizProductId } },
    });

    if (!stock) {
      // 재고 레코드가 없는 경우 신규 생성 (입고만 허용)
      if (params.quantity <= 0) {
        throw new BadRequestException('해당 상품의 재고 레코드가 없습니다. 먼저 입고 처리를 해주세요.');
      }
      return prisma.warehouseStock.create({
        data: {
          warehouseId:     params.warehouseId,
          roubizProductId: params.roubizProductId,
          quantity:        params.quantity,
          allocated:       0,
        },
      });
    }

    if (params.quantity < 0) {
      const available = stock.quantity - stock.allocated;
      if (available < Math.abs(params.quantity)) {
        throw new BadRequestException(
          `가용 재고 부족. (조정 요청: ${params.quantity}, 가용: ${available})`,
        );
      }
    }

    return prisma.warehouseStock.update({
      where: { id: stock.id },
      data:  { quantity: { increment: params.quantity } },
    });
  }

  // [5] 특정 상품 재고 조회 (창고별)
  async getStockByProduct(roubizProductId: number) {
    const stocks = await prisma.warehouseStock.findMany({
      where:   { roubizProductId },
      include: { warehouse: { select: { id: true, name: true, warehouseCode: true } } },
    });

    if (!stocks.length) throw new NotFoundException(`상품(ID:${roubizProductId})의 재고 정보가 없습니다.`);

    return stocks.map(s => ({
      warehouseId:   s.warehouse.id,
      warehouseName: s.warehouse.name,
      warehouseCode: s.warehouse.warehouseCode,
      quantity:      s.quantity,
      allocated:     s.allocated,
      available:     s.quantity - s.allocated,
    }));
  }
}
