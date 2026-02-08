import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { PrismaClient, RoubizOrder, SupplierOrder } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class OrderService {
  
  // [1. 수주 등록]
  async create(dto: CreateOrderDto) {
    const safeOption = dto.optionName?.trim() || '옵션없음';

    const channel = await prisma.salesChannel.findFirst({
      where: { name: dto.channelName },
    });
    
    if (!channel) throw new NotFoundException(`'${dto.channelName}' 판매처를 찾을 수 없습니다.`);

    const clientOrder = await prisma.clientOrder.create({
      data: {
        salesChannelId: channel.id,
        clientOrderNo: dto.orderNo,
        productCode: dto.productCode,
        optionName: safeOption,
        quantity: dto.quantity,
        salesPrice: dto.price,
        orderDate: new Date(),
        isConverted: false,
      }
    });

    const mapping = await prisma.clientProductMapping.findUnique({
      where: {
        channel_product_option: { 
          salesChannelId: channel.id,
          clientProductCode: dto.productCode,
          clientOptionName: safeOption
        }
      },
      include: { roubizProduct: true }
    });

    let roubizOrder: RoubizOrder | null = null; 

    if (mapping) {
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      
      roubizOrder = await prisma.roubizOrder.create({
        data: {
          clientOrderId: clientOrder.id,
          roubizOrderNo: `R-${dateStr}-${randomStr}`,
          roubizProductId: mapping.roubizProductId,
          quantity: dto.quantity,
          status: 'PENDING',
          targetOrderDate: new Date() // 기본값: 오늘
        }
      });

      await prisma.clientOrder.update({
        where: { id: clientOrder.id },
        data: { isConverted: true }
      });
    }

    return {
      message: '주문 접수가 완료되었습니다.',
      status: mapping ? 'SUCCESS' : 'WARNING',
      matchResult: mapping ? `✅ 인식상품: ${mapping.roubizProduct.name}` : '⚠️ 매핑 정보 없음',
      roubizOrderNo: roubizOrder?.roubizOrderNo || null
    };
  }

  // [2. 확정]
  async confirmOrders(roubizOrderIds: number[]) {
    if (!roubizOrderIds || roubizOrderIds.length === 0) throw new BadRequestException('선택된 주문이 없습니다.');
    const result = await prisma.roubizOrder.updateMany({
      where: { id: { in: roubizOrderIds }, status: 'PENDING' },
      data: { 
        status: 'READY',
        targetOrderDate: new Date() // 확정 시 즉시 발주 대상으로 설정
      }
    });
    return { count: result.count, message: `${result.count}건 확정 완료` };
  }

  // [3. 보류 처리 (수동 보류 & 다음 차수 넘기기 통합)]
  async setHoldStatus(dto: { ids: number[], reason: string, type: 'MANUAL' | 'NEXT_ROUND' }) {
    if (!dto.ids || dto.ids.length === 0) throw new BadRequestException('선택된 주문이 없습니다.');
    if (!dto.reason) throw new BadRequestException('보류 사유는 필수입니다.');

    const isNextRound = dto.type === 'NEXT_ROUND';

    const result = await prisma.roubizOrder.updateMany({
      where: { id: { in: dto.ids } },
      data: {
        status: 'HOLD',          // 상태는 HOLD
        holdReason: dto.reason,  // 사유 저장
        isNextRound: isNextRound // 다음 차수 여부 플래그
      }
    });

    return { 
      message: `${result.count}건이 ${isNextRound ? '[다음 차수 대기]' : '[수동 보류]'} 처리되었습니다.` 
    };
  }

  // [4. 지정일 배송 설정]
  async setSchedule(ids: number[], date: string, reason: string) {
    if (!ids || ids.length === 0) throw new BadRequestException('선택된 주문이 없습니다.');
    if (!reason) throw new BadRequestException('지정일 변경 사유는 필수입니다.');

    const targetDate = new Date(date);
    const now = new Date();
    // 미래 날짜면 SCHEDULED, 오늘/과거면 READY
    const newStatus = targetDate > now ? 'SCHEDULED' : 'READY';

    const result = await prisma.roubizOrder.updateMany({
      where: { id: { in: ids } },
      data: {
        status: newStatus,
        targetOrderDate: targetDate,
        holdReason: reason
      }
    });

    return { message: `${result.count}건의 발주 예정일이 변경되었습니다.` };
  }

  // [5. 발주 관제 대시보드 (3개 탭 데이터 분리)]
  async getDispatchDashboard() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const allOrders = await prisma.roubizOrder.findMany({
      where: {
        status: { in: ['READY', 'HOLD', 'SCHEDULED'] }
      },
      include: {
        roubizProduct: true,
        clientOrder: { include: { salesChannel: true } }
      },
      orderBy: { targetOrderDate: 'asc' }
    });

    // [핵심 수정] TypeScript에게 배열에 들어갈 데이터 타입을 명시합니다.
    type OrderType = typeof allOrders[0];

    const dashboard: {
      ready: OrderType[];
      hold: OrderType[];
      scheduled: OrderType[];
    } = {
      ready: [],      // [발주대기]
      hold: [],       // [발주보류] (수동 + 다음차수)
      scheduled: []   // [지정일배송]
    };

    for (const order of allOrders) {
      if (order.status === 'HOLD') {
        dashboard.hold.push(order);
      } else if (order.status === 'SCHEDULED' || (order.targetOrderDate && new Date(order.targetOrderDate) > endOfToday)) {
        dashboard.scheduled.push(order);
      } else {
        dashboard.ready.push(order);
      }
    }

    return dashboard;
  }

  // [6. 발주 생성 (다음 차수 자동 복귀 로직 포함)]
  async createSupplierOrders(dto: CreateSupplierOrderDto) {
    // 1. 발주 대상 조회
    const orders = await prisma.roubizOrder.findMany({
      where: { id: { in: dto.roubizOrderIds }, status: 'READY' },
      include: {
        roubizProduct: {
          include: {
            childBundles: true,
            supplierProducts: { where: { isPrimary: true }, include: { supplier: true } }
          }
        }
      }
    });

    if (orders.length === 0) throw new NotFoundException('발주 가능한 주문이 없습니다.');

    // 2. 발주서 생성 로직
    const supplierBatches = new Map<number, any[]>();

    for (const order of orders) {
      const product = order.roubizProduct;
      const primaryMapping = product.supplierProducts[0];

      if (!primaryMapping) continue;

      const sId = primaryMapping.supplierId;
      if (!supplierBatches.has(sId)) supplierBatches.set(sId, []);

      if (product.isSet) {
        for (const bundle of product.childBundles) {
          supplierBatches.get(sId)!.push({
            roubizProductId: bundle.childProductId,
            quantity: order.quantity * bundle.quantity,
            unitCost: 0 
          });
        }
      } else {
        supplierBatches.get(sId)!.push({
          roubizProductId: order.roubizProductId,
          quantity: order.quantity,
          unitCost: primaryMapping.costPrice
        });
      }
    }

    const createdOrders: SupplierOrder[] = [];
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    for (const [supplierId, items] of supplierBatches.entries()) {
      const todayCount = await prisma.supplierOrder.count({
        where: {
          supplierId: supplierId,
          orderedAt: { gte: todayStart, lte: todayEnd }
        }
      });
      const nextRound = todayCount + 1;

      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();

      const newSupplierOrder = await prisma.supplierOrder.create({
        data: {
          supplierId: supplierId,
          supplierOrderNo: `PO-${dateStr}-${randomStr}`,
          round: nextRound,
          status: 'ORDERED',
          items: {
            create: items.map(item => ({
              roubizProductId: item.roubizProductId,
              quantity: item.quantity,
              unitCost: item.unitCost
            }))
          }
        }
      });
      createdOrders.push(newSupplierOrder);
    }

    // 3. 상태 업데이트 (ORDERED)
    await prisma.roubizOrder.updateMany({
      where: { id: { in: dto.roubizOrderIds }, status: 'READY' },
      data: { status: 'ORDERED' }
    });

    // =========================================================
    // [핵심] "다음 차수로 넘기기" 설정된 주문들 자동 복귀
    // =========================================================
    await prisma.roubizOrder.updateMany({
      where: {
        status: 'HOLD',
        isNextRound: true
      },
      data: {
        status: 'READY',      // 다시 대기 상태로
        isNextRound: false,   // 플래그 초기화
        // holdReason: null   // 사유는 기록용으로 남김 (필요 시 주석 해제)
      }
    });

    return { supplierOrders: createdOrders };
  }

  // [7. 발주서 삭제]
  async cancelSupplierOrder(supplierOrderId: number) {
    const targetPO = await prisma.supplierOrder.findUnique({ where: { id: supplierOrderId } });
    if (!targetPO) throw new NotFoundException('존재하지 않는 발주서입니다.');

    await prisma.supplierOrder.delete({
      where: { id: supplierOrderId }
    });

    return { message: `발주서(${targetPO.supplierOrderNo})가 삭제되었습니다. 필요 시 주문 상태를 복구(Rollback)해주세요.` };
  }

  // [8. 주문 상태 복구]
  async rollbackOrders(roubizOrderIds: number[]) {
    const result = await prisma.roubizOrder.updateMany({
      where: { id: { in: roubizOrderIds }, status: 'ORDERED' },
      data: { status: 'READY' }
    });
    return { message: `${result.count}건의 주문이 발주대기 상태로 복구되었습니다.` };
  }

  // [9. 발주서 상세 조회]
  async findSupplierOrder(id: number) {
    const order = await prisma.supplierOrder.findUnique({
      where: { id },
      include: {
        supplier: {
          include: { business: true } 
        },
        items: {
          include: { roubizProduct: true }
        }
      }
    });

    if (!order) throw new NotFoundException('해당 발주서를 찾을 수 없습니다.');
    return order;
  }

  async findAll() {
    return await prisma.clientOrder.findMany({
      include: { roubizOrders: { include: { roubizProduct: true } } },
      orderBy: { id: 'desc' },
    });
  }

  async remove(id: number) {
    return await prisma.clientOrder.delete({ where: { id } });
  }
}