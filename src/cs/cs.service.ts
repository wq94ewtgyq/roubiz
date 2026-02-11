import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CS 상태 전환 허용 맵
const CS_TRANSITIONS: Record<string, string[]> = {
  TEMP_REGISTERED:    ['CONFIRMED'],
  CONFIRMED:          ['RECEIVED_PENDING'],
  RECEIVED_PENDING:   ['RECEIVED'],
  RECEIVED:           ['PROCESSING_PENDING'],
  PROCESSING_PENDING: ['PROCESSING_COMPLETE'],
  PROCESSING_COMPLETE:[],
};

@Injectable()
export class CsService {

  // CS 번호 채번 (CS-YYYYMMDD-XXXXX)
  private generateCsNo(): string {
    const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `CS-${date}-${random}`;
  }

  // ─────────────────────────────────────
  // [1] 조회
  // ─────────────────────────────────────

  async findAll(status?: string) {
    return prisma.cs.findMany({
      where:   status ? { status } : undefined,
      include: {
        order:    { select: { roubizOrderNo: true, status: true } },
        tasks:    true,
        histories:{ orderBy: { changedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const cs = await prisma.cs.findUnique({
      where: { id },
      include: {
        order:    { include: { roubizProduct: true, executions: true } },
        tasks:    true,
        histories:{ orderBy: { changedAt: 'desc' } },
      },
    });
    if (!cs) throw new NotFoundException(`CS(ID:${id})를 찾을 수 없습니다.`);
    return cs;
  }

  // ─────────────────────────────────────
  // [2] 등록 (임시등록)
  // ─────────────────────────────────────

  async create(dto: {
    csType?:     string;
    reason?:     string;
    description?:string;
    clientName?: string;
    orderId?:    number;
  }) {
    if (dto.orderId) {
      const order = await prisma.roubizOrder.findUnique({ where: { id: dto.orderId } });
      if (!order) throw new NotFoundException(`주문(ID:${dto.orderId})을 찾을 수 없습니다.`);
    }
    return prisma.cs.create({
      data: { csNo: this.generateCsNo(), status: 'TEMP_REGISTERED', ...dto },
    });
  }

  // ─────────────────────────────────────
  // [3] 상태 전환
  // ─────────────────────────────────────

  async updateStatus(id: number, dto: { nextStatus: string; note?: string }) {
    const cs          = await this.findOne(id);
    const allowed     = CS_TRANSITIONS[cs.status] ?? [];

    if (!allowed.includes(dto.nextStatus)) {
      throw new BadRequestException(
        `'${cs.status}' → '${dto.nextStatus}' 전환 불가. (가능: ${allowed.join(', ') || '없음'})`,
      );
    }

    await prisma.$transaction([
      prisma.cs.update({ where: { id }, data: { status: dto.nextStatus } }),
      prisma.csHistory.create({
        data: { csId: id, prevStatus: cs.status, nextStatus: dto.nextStatus, note: dto.note },
      }),
    ]);

    return { id, prevStatus: cs.status, nextStatus: dto.nextStatus };
  }

  // ─────────────────────────────────────
  // [4] 할일(Task) 관리
  // ─────────────────────────────────────

  async addTask(csId: number, dto: { taskType: string; note?: string }) {
    await this.findOne(csId);
    return prisma.csTask.create({ data: { csId, ...dto } });
  }

  async completeTask(taskId: number) {
    const task = await prisma.csTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task(ID:${taskId})를 찾을 수 없습니다.`);
    if (task.isDone) throw new BadRequestException('이미 완료된 Task입니다.');

    return prisma.csTask.update({
      where: { id: taskId },
      data:  { isDone: true, doneAt: new Date() },
    });
  }

  // ─────────────────────────────────────
  // [5] 접수 대기 리스트 (매입처 CS 목록용)
  // ─────────────────────────────────────

  async getReceivedPendingList() {
    return prisma.cs.findMany({
      where: { status: 'RECEIVED_PENDING' },
      include: {
        order: {
          include: { clientOrder: { include: { client: true } }, roubizProduct: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
