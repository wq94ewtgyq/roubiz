import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 배송비 단가 (박스 1개당, 추후 창고/매입처 단가로 교체 가능)
const SHIPPING_COST_PER_BOX = 2500;

@Injectable()
export class SettlementService {

  // ─────────────────────────────────────
  // 공통 쿼리 빌더
  // ─────────────────────────────────────

  private buildDateFilter(from?: string, to?: string, month?: string) {
    if (month) {
      // ex: "2026-02" → 해당 월 전체
      const [y, m] = month.split('-').map(Number);
      return {
        gte: new Date(y, m - 1, 1),
        lt:  new Date(y, m, 1),
      };
    }
    if (from || to) {
      return {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(`${to}T23:59:59`) }),
      };
    }
    return undefined;
  }

  private async fetchOrders(dateFilter?: any, clientId?: number, statusFilter?: string[]) {
    return prisma.roubizOrder.findMany({
      where: {
        ...(dateFilter   && { createdAt: dateFilter }),
        ...(clientId     && { clientOrder: { clientId } }),
        ...(statusFilter && { status: { in: statusFilter } }),
      },
      include: {
        clientOrder: { include: { client: true } },
        roubizProduct: true,
        executions:    true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────
  // 손익 계산 (핵심 로직)
  // ─────────────────────────────────────

  private calculateProfit(order: any) {
    const revenue     = Number(order.clientOrder.salesPrice ?? 0);
    const unitCost    = Number(order.roubizProduct.standardCost ?? 0);
    const totalCost   = unitCost * order.quantity;
    const boxCount    = order.executions.filter((e: any) => e.status !== 'CANCELLED').length;
    const shipping    = boxCount * SHIPPING_COST_PER_BOX;
    const profit      = revenue - totalCost - shipping;
    const marginRate  = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';

    return {
      orderNo:     order.roubizOrderNo,
      clientName:  order.clientOrder.client?.name ?? '',
      orderDate:   order.createdAt,
      product:     order.roubizProduct.name,
      optionName:  order.roubizProduct.optionName,
      qty:         order.quantity,
      boxCount,
      breakdown: {
        revenue,          // 매출
        cost:   totalCost,// 원가
        shipping,         // 배송비
        profit,           // 순이익
      },
      marginRate: `${marginRate}%`,
      status:     order.status,
    };
  }

  // ─────────────────────────────────────
  // [1] 전체 정산 장부 (기간/거래처 필터)
  // ─────────────────────────────────────

  async findAll(query: { from?: string; to?: string; month?: string; clientId?: number }) {
    const dateFilter = this.buildDateFilter(query.from, query.to, query.month);
    const orders     = await this.fetchOrders(dateFilter, query.clientId);
    return orders.map(o => this.calculateProfit(o));
  }

  // ─────────────────────────────────────
  // [2] 특정 주문 정산 상세
  // ─────────────────────────────────────

  async calculate(orderId: number) {
    const order = await prisma.roubizOrder.findUnique({
      where:   { id: orderId },
      include: {
        clientOrder:  { include: { client: true } },
        roubizProduct:true,
        executions:   true,
      },
    });
    if (!order) throw new NotFoundException('주문 정보를 찾을 수 없습니다.');
    return this.calculateProfit(order);
  }

  // ─────────────────────────────────────
  // [3] 손익장 (P&L Report) — 거래처별 집계
  // ─────────────────────────────────────

  async getProfitLossReport(query: { from?: string; to?: string; month?: string }) {
    const dateFilter = this.buildDateFilter(query.from, query.to, query.month);
    const orders     = await this.fetchOrders(dateFilter);
    const rows       = orders.map(o => this.calculateProfit(o));

    // 전체 합계
    const total = rows.reduce(
      (acc, r) => ({
        revenue:  acc.revenue  + r.breakdown.revenue,
        cost:     acc.cost     + r.breakdown.cost,
        shipping: acc.shipping + r.breakdown.shipping,
        profit:   acc.profit   + r.breakdown.profit,
      }),
      { revenue: 0, cost: 0, shipping: 0, profit: 0 },
    );
    const totalMargin = total.revenue > 0
      ? ((total.profit / total.revenue) * 100).toFixed(1)
      : '0';

    // 거래처별 집계
    const byClientMap = new Map<string, typeof total & { clientName: string; orderCount: number }>();
    for (const r of rows) {
      const key = r.clientName || '(미연결)';
      const cur = byClientMap.get(key) ?? { clientName: key, revenue: 0, cost: 0, shipping: 0, profit: 0, orderCount: 0 };
      cur.revenue   += r.breakdown.revenue;
      cur.cost      += r.breakdown.cost;
      cur.shipping  += r.breakdown.shipping;
      cur.profit    += r.breakdown.profit;
      cur.orderCount++;
      byClientMap.set(key, cur);
    }

    return {
      period: { from: query.from, to: query.to, month: query.month },
      summary: { ...total, marginRate: `${totalMargin}%`, orderCount: rows.length },
      byClient: Array.from(byClientMap.values()).map(c => ({
        ...c,
        marginRate: c.revenue > 0 ? `${((c.profit / c.revenue) * 100).toFixed(1)}%` : '0%',
      })),
      orders: rows,
    };
  }

  // ─────────────────────────────────────
  // [4] 판매처별 정산 출력용 데이터 (정산 출력 양식 등록된 판매처 대상)
  // ─────────────────────────────────────

  async getClientSettlements(query: { from?: string; to?: string; month?: string }) {
    const dateFilter = this.buildDateFilter(query.from, query.to, query.month);

    // 정산 출력 양식이 등록된 판매처만 대상
    // NOTE: prisma generate 실행 전까지 신규 필드는 as any 캐스팅으로 접근
    const clients = await (prisma.client.findMany as any)({
      where: { settlementOutputFormat: { not: null } },
    }) as any[];

    const result: any[] = [];
    for (const client of clients) {
      const orders = await this.fetchOrders(dateFilter, client.id, ['COMPLETED', 'READY', 'PARTIAL']);
      if (!orders.length) continue;

      const rows = orders.map((o: any) => this.calculateProfit(o));
      const subtotal = rows.reduce(
        (acc: any, r: any) => ({
          revenue:  acc.revenue  + r.breakdown.revenue,
          cost:     acc.cost     + r.breakdown.cost,
          shipping: acc.shipping + r.breakdown.shipping,
          profit:   acc.profit   + r.breakdown.profit,
        }),
        { revenue: 0, cost: 0, shipping: 0, profit: 0 },
      );

      result.push({
        clientId:              client.id,
        clientName:            client.name,
        settlementOutputFormat:client.settlementOutputFormat,
        orderCount:            rows.length,
        subtotal,
        orders:                rows,
      });
    }
    return result;
  }
}
