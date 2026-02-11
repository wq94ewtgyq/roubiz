import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { PrismaClient, RoubizOrder, OrderExecution, Prisma } from '@prisma/client';
import { ExcelService } from '../common/excel.service'; 
import { InventoryService } from '../inventory/inventory.service';

const prisma = new PrismaClient();

@Injectable()
export class OrderService {
  constructor(
    private readonly excelService: ExcelService,
    private readonly inventoryService: InventoryService,
  ) {} 

  // [1. 수주 등록] - ★ 스마트 분할 로직 탑재
  async create(dto: CreateOrderDto) {
    const safeOption = dto.optionName?.trim() || '옵션없음';
    const client = await prisma.client.findFirst({ where: { name: dto.channelName } });
    if (!client) throw new NotFoundException(`'${dto.channelName}' Client를 찾을 수 없습니다.`);

    // 1. 고객 주문 원본 저장
    const clientOrder = await prisma.clientOrder.create({
      data: {
        clientId: client.id, clientOrderNo: dto.orderNo, productCode: dto.productCode,
        optionName: safeOption, quantity: dto.quantity, salesPrice: dto.price,
        orderDate: new Date(), isConverted: false,
      }
    });

    // 2. 상품 매핑 확인
    const mapping = await prisma.clientProductMapping.findUnique({
      where: { client_product_option: { clientId: client.id, clientProductCode: dto.productCode, clientOptionName: safeOption } },
      include: { roubizProduct: true }
    });

    let roubizOrder: RoubizOrder | null = null; 

    if (mapping) {
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      const newOrderNo = `R-${dateStr}-${randomStr}`;

      // ★ [스마트 분할 로직 시작]
      const MAX_PER_BOX = 10; 
      const totalQuantity = dto.quantity;
      const boxCount = Math.ceil(totalQuantity / MAX_PER_BOX);
      
      const executions: Prisma.OrderExecutionUncheckedCreateWithoutOrderInput[] = [];

      for (let i = 1; i <= boxCount; i++) {
          const qty = (i === boxCount) ? totalQuantity - (MAX_PER_BOX * (i - 1)) : MAX_PER_BOX;
          const suffix = `_${i}x${boxCount}`; 
          
          executions.push({
            executionNo: `${newOrderNo}${suffix}`,
            executionType: mapping.targetWarehouseId ? 'WAREHOUSE' : 'SUPPLIER',
            warehouseId: mapping.targetWarehouseId || null,
            quantity: qty, 
            status: 'PENDING'
          });
      }
      // ★ [스마트 분할 로직 끝]

      // 3. 매출(부모) + 실행(자식들) 동시 생성
      roubizOrder = await prisma.roubizOrder.create({
        data: {
          clientOrderId: clientOrder.id, roubizOrderNo: newOrderNo,
          roubizProductId: mapping.roubizProductId, quantity: dto.quantity, status: 'PENDING',
          executions: { create: executions }
        }
      });

      await prisma.clientOrder.update({ where: { id: clientOrder.id }, data: { isConverted: true } });
    }

    return { 
        message: '접수 완료', 
        roubizOrderNo: roubizOrder?.roubizOrderNo,
        splitCount: roubizOrder ? Math.ceil(dto.quantity / 10) : 0 
    };
  }

  // [2. 확정]
  async confirmOrders(roubizOrderIds: number[]) {
    const orders = await prisma.roubizOrder.findMany({
      where: { id: { in: roubizOrderIds }, status: 'PENDING' },
      include: { executions: true }
    });

    const successIds: number[] = [];

    for (const order of orders) {
      for (const exec of order.executions) {
        if (exec.status !== 'PENDING') continue;

        if (exec.executionType === 'WAREHOUSE' && exec.warehouseId) {
          try {
             await this.inventoryService.allocateStock(exec.warehouseId, order.roubizProductId, exec.quantity);
          } catch (e) {
             throw new BadRequestException(`[${order.roubizOrderNo}] 재고 할당 실패: ${e.message}`);
          }
        }
        
        await prisma.orderExecution.update({
           where: { id: exec.id }, data: { status: 'READY' }
        });
      }

      await prisma.roubizOrder.update({
        where: { id: order.id }, data: { status: 'READY' }
      });
      successIds.push(order.id);
    }
    return { message: `${successIds.length}건 확정 완료 (재고할당 성공)` };
  }

  // [3. 보류]
  async setHoldStatus(dto: { ids: number[], reason: string, type?: string }) {
    const orders = await prisma.roubizOrder.findMany({
        where: { id: { in: dto.ids } },
        include: { executions: true }
    });

    for (const order of orders) {
        for (const exec of order.executions) {
            if (exec.status === 'READY' && exec.executionType === 'WAREHOUSE' && exec.warehouseId) {
                await this.inventoryService.releaseStock(exec.warehouseId, order.roubizProductId, exec.quantity);
            }
        }
        await prisma.roubizOrder.update({
             where: { id: order.id }, data: { status: 'HOLD' } 
        });
    }
    return { message: '보류 처리 완료 (재고 할당 해제됨)' };
  }

  // [4. 발주 생성 (위탁)]
  async createSupplierOrders(dto: CreateSupplierOrderDto) {
    const executions = await prisma.orderExecution.findMany({
      where: { orderId: { in: dto.roubizOrderIds }, status: 'READY', executionType: 'SUPPLIER' }
    });

    if (executions.length === 0) throw new BadRequestException('발주 가능한 위탁 건이 없습니다.');

    await prisma.orderExecution.updateMany({
      where: { id: { in: executions.map(e => e.id) } },
      data: { status: 'INSTRUCTED' }
    });
    
    await prisma.roubizOrder.updateMany({
      where: { id: { in: dto.roubizOrderIds } },
      data: { status: 'PARTIAL' }
    });
    return { message: `${executions.length}건 발주지시 완료` };
  }

  // [5. 출고처 변경]
  async changeOrderSource(dto: { roubizOrderIds: number[], sourceType: 'SUPPLIER' | 'WAREHOUSE', warehouseId?: number }) {
    const executions = await prisma.orderExecution.findMany({
      where: { orderId: { in: dto.roubizOrderIds } }
    });

    await prisma.orderExecution.updateMany({
      where: { id: { in: executions.map(e => e.id) } },
      data: {
        executionType: dto.sourceType,
        warehouseId: dto.sourceType === 'SUPPLIER' ? null : dto.warehouseId,
        supplierId: null
      }
    });
    return { message: '출고처 변경 완료' };
  }

  // [6. 운송장 업로드] - (수정완료) PM님 표준 양식 적용
  async uploadWaybill(fileBuffer: Buffer) {
    const rows = this.excelService.readExcel(fileBuffer);
    const results: any[] = [];

    for (const row of rows) {
      // 1. PM님 표준 양식 컬럼 매핑
      const action = String(row['행동'] || '등록').trim(); 
      const execNo = String(row['발주번호'] || '').trim();
      const carrierName = String(row['택배사명'] || '').trim(); 
      const trackingNo = String(row['운송장번호'] || '').trim().replace(/[^a-zA-Z0-9]/g, '');

      // 2. 발주 데이터 찾기
      const execution = await prisma.orderExecution.findUnique({ 
          where: { executionNo: execNo },
          include: { order: true } 
      });

      if (!execution) {
        results.push({ execNo, status: 'FAIL', msg: '발주번호 없음' });
        continue;
      }

      // 3. 택배사 자동 매핑 (이름 -> ID)
      let carrierId = execution.carrierId; 
      if (carrierName) {
        const carrier = await prisma.carrier.findFirst({ where: { name: carrierName } });
        if (carrier) {
            carrierId = carrier.id;
        }
      }

      // 4. 재고 출고 처리 (창고인 경우만)
      if (execution.executionType === 'WAREHOUSE' && execution.warehouseId && execution.status !== 'SHIPPING') {
             await this.inventoryService.shipStock(
                 execution.warehouseId, execution.order.roubizProductId, execution.quantity
             );
      }

      // 5. 업데이트 실행
      await prisma.orderExecution.update({
        where: { id: execution.id },
        data: { 
            status: 'SHIPPING', 
            trackingNumber: trackingNo, 
            carrierId: carrierId,
            shippedAt: new Date() 
        }
      });
      // trackingNumber: trackingNo  <-- 이걸 추가했습니다!
      results.push({ execNo, action, status: 'SUCCESS', carrier: carrierName });
    }
    return { results };
  }

  // [7. 엑셀 다운로드 (Client용)]
  async downloadWaybillForClient(clientId: number, orderIds: number[]) {
    const orders = await prisma.roubizOrder.findMany({
        where: { id: { in: orderIds }, clientOrder: { clientId: clientId } },
        include: { clientOrder: true, executions: { include: { carrier: true } } }
    });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client 정보 없음');

    let format: Record<string, string> = { '주문번호': 'clientOrder.clientOrderNo', '송장번호': 'execution.trackingNumber' };
    try {
        if (typeof client.waybillFormat === 'string') {
            format = JSON.parse(client.waybillFormat);
        } else if (client.waybillFormat) {
            format = client.waybillFormat as Record<string, string>;
        }
    } catch(e) {}

    const excelData: any[] = [];
    for (const order of orders) {
        for (const exec of order.executions) {
            if (exec.trackingNumber) {
                const row: any = {};
                for (const [header, keyPath] of Object.entries(format)) {
                    if (keyPath === 'clientOrder.clientOrderNo') row[header] = order.clientOrder.clientOrderNo;
                    else if (keyPath === 'execution.trackingNumber' || keyPath === 'trackingNumber') row[header] = exec.trackingNumber;
                    else if (keyPath === 'execution.carrier.name' || keyPath === 'carrier.name') row[header] = exec.carrier?.name || '';
                    else row[header] = ''; 
                }
                excelData.push(row);
            }
        }
    }
    return { buffer: this.excelService.writeExcel(excelData), filename: `waybill.xlsx` };
  }

  // [8. 발주 관제 대시보드]
  async getDispatchDashboard() {
    const orders = await prisma.roubizOrder.findMany({
        where: { status: { in: ['READY', 'HOLD', 'SCHEDULED', 'PARTIAL'] } },
        include: { roubizProduct: true, executions: true, clientOrder: { include: { client: true } } },
        orderBy: { createdAt: 'desc' }
    });
    return {
        ready: orders.filter(o => o.status === 'READY' || o.status === 'PARTIAL'),
        hold: orders.filter(o => o.status === 'HOLD'),
        scheduled: orders.filter(o => o.status === 'SCHEDULED'),
    };
  }

  // ======================================================
  // [Step 2. CS/클레임] 배송 전 주문 취소
  // ======================================================

  /**
   * [취소] 배송 전 주문 취소
   *
   * - WAREHOUSE: allocated(할당 재고) 해제 후 CANCELLED
   * - SUPPLIER:  상태만 CANCELLED
   *
   * 취소 불가 조건:
   *   1. 이미 COMPLETED / CANCELLED 상태
   *   2. 실행 건 중 하나라도 SHIPPING / RETURNED 상태
   */
  async cancelOrders(dto: { ids: number[]; reason: string }) {
    const orders = await prisma.roubizOrder.findMany({
      where: { id: { in: dto.ids } },
      include: { executions: true },
    });

    const results: { id: number; orderNo?: string; status: string; reason?: string }[] = [];

    for (const order of orders) {
      // ── 가드 1: 이미 종료된 주문
      if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
        results.push({ id: order.id, orderNo: order.roubizOrderNo, status: 'SKIP', reason: '이미 완료/취소된 주문' });
        continue;
      }

      // ── 가드 2: 출고(SHIPPING)·반품(RETURNED) 실행 건이 하나라도 존재하면 취소 불가
      const hasShipped = order.executions.some(e => ['SHIPPING', 'RETURNED'].includes(e.status));
      if (hasShipped) {
        results.push({ id: order.id, orderNo: order.roubizOrderNo, status: 'FAIL', reason: '이미 출고된 실행 건 포함 — 취소 불가' });
        continue;
      }

      // ── 실행 건별 처리
      for (const exec of order.executions) {
        if (exec.status === 'CANCELLED') continue;

        /**
         * WAREHOUSE + READY 상태일 때만 할당 해제.
         * ※ HOLD 주문은 setHoldStatus()에서 이미 해제했으므로 중복 차감 방지.
         */
        if (
          exec.executionType === 'WAREHOUSE' &&
          exec.warehouseId &&
          exec.status === 'READY' &&
          order.status !== 'HOLD'
        ) {
          await this.inventoryService.releaseStock(exec.warehouseId, order.roubizProductId, exec.quantity);
        }

        await prisma.orderExecution.update({
          where: { id: exec.id },
          data: { status: 'CANCELLED' },
        });
      }

      // ── 주문 상태 → CANCELLED
      const prevStatus = order.status;
      await prisma.roubizOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      // ── 이력 기록
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          prevStatus,
          nextStatus: 'CANCELLED',
          reason: dto.reason || '배송 전 취소',
        },
      });

      results.push({ id: order.id, orderNo: order.roubizOrderNo, status: 'SUCCESS' });
    }

    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    return { message: `${successCount}건 취소 완료`, results };
  }

  // [기타 Stub 구현]
  async setSchedule(ids: number[], date: string, reason: string) { return { message: '기능 미구현' }; }
  async cancelSupplierOrder(id: number) { return { message: '기능 미구현' }; }
  async rollbackOrders(ids: number[]) { return { message: '기능 미구현' }; }
  async findSupplierOrder(id: number) { return null; }
  async remove(id: number) { return { message: '삭제됨' }; }

  // ★ [수정] 진짜 데이터를 조회하도록 변경 (주문 확인용)
  async findAll() { 
    return await prisma.roubizOrder.findMany({
      include: {
        clientOrder: true,
        executions: true,
        roubizProduct: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}