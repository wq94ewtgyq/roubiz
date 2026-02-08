import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { PrismaClient, RoubizOrder, SupplierOrder } from '@prisma/client';
import { ExcelService } from '../common/excel.service'; 

// ⚠️ 주의: 여기에 'import { OrderService } ...' 가 있으면 절대 안 됩니다! (삭제됨)

const prisma = new PrismaClient();

@Injectable()
export class OrderService {
  constructor(private readonly excelService: ExcelService) {} 

  // [1. 수주 등록]
  async create(dto: CreateOrderDto) {
    const safeOption = dto.optionName?.trim() || '옵션없음';

    const client = await prisma.client.findFirst({
      where: { name: dto.channelName },
    });
    
    if (!client) throw new NotFoundException(`'${dto.channelName}' Client(판매처)를 찾을 수 없습니다.`);

    const clientOrder = await prisma.clientOrder.create({
      data: {
        clientId: client.id,
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
        client_product_option: { 
          clientId: client.id,
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
          targetOrderDate: new Date() 
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
        targetOrderDate: new Date() 
      }
    });
    return { count: result.count, message: `${result.count}건 확정 완료` };
  }

  // [3. 보류 처리]
  async setHoldStatus(dto: { ids: number[], reason: string, type: 'MANUAL' | 'NEXT_ROUND' }) {
    if (!dto.ids || dto.ids.length === 0) throw new BadRequestException('선택된 주문이 없습니다.');
    if (!dto.reason) throw new BadRequestException('보류 사유는 필수입니다.');

    const isNextRound = dto.type === 'NEXT_ROUND';

    const result = await prisma.roubizOrder.updateMany({
      where: { id: { in: dto.ids } },
      data: {
        status: 'HOLD',          
        holdReason: dto.reason,  
        isNextRound: isNextRound 
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

  // [5. 발주 관제 대시보드]
  async getDispatchDashboard() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const allOrders = await prisma.roubizOrder.findMany({
      where: {
        status: { in: ['READY', 'HOLD', 'SCHEDULED'] }
      },
      include: {
        roubizProduct: true,
        clientOrder: { include: { client: true } }
      },
      orderBy: { targetOrderDate: 'asc' }
    });

    type OrderType = typeof allOrders[0];

    const dashboard: {
      ready: OrderType[];
      hold: OrderType[];
      scheduled: OrderType[];
    } = {
      ready: [],      
      hold: [],       
      scheduled: []   
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

  // [6. 발주 생성]
  async createSupplierOrders(dto: CreateSupplierOrderDto) {
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

    await prisma.roubizOrder.updateMany({
      where: { id: { in: dto.roubizOrderIds }, status: 'READY' },
      data: { status: 'ORDERED' }
    });

    await prisma.roubizOrder.updateMany({
      where: {
        status: 'HOLD',
        isNextRound: true
      },
      data: {
        status: 'READY',
        isNextRound: false,
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

  // [10. 통합 운송장 업로드 (행동 기반)]
  async uploadWaybill(fileBuffer: Buffer) {
    const rows = this.excelService.readExcel(fileBuffer);
    const results: any[] = [];

    for (const row of rows) {
      const action = String(row['행동'] || '').trim(); 
      const orderNo = String(row['발주번호'] || '').trim(); 
      const carrierName = String(row['택배사명'] || '').trim();
      let trackingNo = String(row['운송장번호'] || '').trim();

      trackingNo = trackingNo.replace(/[^a-zA-Z0-9]/g, '');

      try {
        const order = await prisma.roubizOrder.findUnique({
          where: { roubizOrderNo: orderNo },
        });

        if (!order) {
            results.push({ orderNo, status: 'FAIL', msg: '주문번호 없음' });
            continue;
        }

        let carrierId: number | null = null;
        if (carrierName && action !== '삭제') {
           const mapping = await prisma.carrierMapping.findUnique({ where: { alias: carrierName } });
           if (mapping) {
             carrierId = mapping.carrierId;
           } else {
             const standard = await prisma.carrier.findFirst({ where: { name: carrierName } });
             if (standard) carrierId = standard.id;
             else throw new Error(`시스템에 등록되지 않은 택배사명(${carrierName})`);
           }
        }

        if (action === '등록') {
          if (order.trackingNumber) {
             if (order.trackingNumber === trackingNo) {
                 results.push({ orderNo, status: 'SKIP', msg: '동일 운송장 이미 존재' });
                 continue;
             }
             throw new Error(`이미 운송장(${order.trackingNumber})이 존재함. '수정' 모드 사용 필요.`);
          }
          
          await prisma.roubizOrder.update({
            where: { id: order.id },
            data: {
              carrierId,
              trackingNumber: trackingNo,
              status: 'SHIPPING',
              shippedAt: new Date()
            }
          });
          results.push({ orderNo, status: 'SUCCESS', msg: '등록 완료' });

        } else if (action === '수정') {
          await prisma.roubizOrder.update({
            where: { id: order.id },
            data: {
              carrierId: carrierId || order.carrierId,
              trackingNumber: trackingNo,
              status: 'SHIPPING',
              shippedAt: new Date()
            }
          });
          results.push({ orderNo, status: 'SUCCESS', msg: '수정 완료' });

        } else if (action === '삭제') {
          await prisma.roubizOrder.update({
            where: { id: order.id },
            data: {
              carrierId: null,
              trackingNumber: null,
              status: 'ORDERED',
              shippedAt: null
            }
          });
          results.push({ orderNo, status: 'SUCCESS', msg: '삭제 완료' });

        } else {
          throw new Error(`알 수 없는 행동: ${action}`);
        }

      } catch (e) {
        results.push({ orderNo, status: 'FAIL', msg: e.message });
      }
    }

    return { total: rows.length, results };
  }

  // [11. Client용 운송장 회신 (엑셀 다운로드)]
  async downloadWaybillForClient(clientId: number, orderIds: number[]) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException('Client(판매처)를 찾을 수 없습니다.');

    const orders = await prisma.roubizOrder.findMany({
      where: {
        id: { in: orderIds },
        status: 'SHIPPING', 
        clientOrder: { clientId: clientId }
      },
      include: {
        clientOrder: true,
        carrier: true
      }
    });

    if (orders.length === 0) throw new NotFoundException('출력할 배송 중인 주문이 없습니다.');

    const format = client.waybillFormat as Record<string, string> || {
      '주문번호': 'clientOrder.clientOrderNo',
      '택배사': 'carrier.name',
      '송장번호': 'trackingNumber'
    };

    const excelData = orders.map(order => {
      const row: any = {};
      for (const [header, keyPath] of Object.entries(format)) {
        const keys = keyPath.split('.');
        let value: any = order;
        for (const k of keys) {
          value = value ? value[k] : '';
        }
        row[header] = value;
      }
      return row;
    });

    return {
      buffer: this.excelService.writeExcel(excelData),
      filename: `${client.name}_운송장등록_${new Date().toISOString().slice(0,10)}.xlsx`
    };
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