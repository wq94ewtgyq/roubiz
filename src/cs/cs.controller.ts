import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { CsService } from './cs.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('CS/AS 관리')
@Controller('cs')
export class CsController {
  constructor(private readonly csService: CsService) {}

  // ─────────────────────────────────────
  // 조회
  // ─────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'CS 목록 조회 (상태 필터 가능)' })
  @ApiQuery({
    name: 'status', required: false,
    description: 'TEMP_REGISTERED | CONFIRMED | RECEIVED_PENDING | RECEIVED | PROCESSING_PENDING | PROCESSING_COMPLETE',
  })
  findAll(@Query('status') status?: string) {
    return this.csService.findAll(status);
  }

  @Get('received-pending')
  @ApiOperation({ summary: '접수 대기 CS 목록 (매입처 전달용)' })
  getReceivedPendingList() {
    return this.csService.getReceivedPendingList();
  }

  @Get(':id')
  @ApiOperation({ summary: 'CS 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.csService.findOne(id);
  }

  // ─────────────────────────────────────
  // 등록
  // ─────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'CS 등록 (임시등록 상태로 생성)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        csType:      { type: 'string', example: 'RETURN',     description: 'RETURN | EXCHANGE | CANCEL | INQUIRY | OTHER' },
        reason:      { type: 'string', example: '상품 불량' },
        description: { type: 'string', example: '내용물 파손. 고객 요청으로 반품 처리 예정.' },
        clientName:  { type: 'string', example: '홍길동 010-1234-5678' },
        orderId:     { type: 'number', example: 1, description: '연결할 주문 ID (선택)' },
      },
    },
  })
  create(@Body() body: any) {
    return this.csService.create(body);
  }

  // ─────────────────────────────────────
  // 상태 전환
  // ─────────────────────────────────────

  @Patch(':id/status')
  @ApiOperation({
    summary:     'CS 상태 전환',
    description: '임시등록 → 확정 → 접수대기 → 접수완료 → 처리대기 → 처리완료 순서로만 전환 가능',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nextStatus'],
      properties: {
        nextStatus: { type: 'string', example: 'CONFIRMED' },
        note:       { type: 'string', example: '담당자 검토 완료' },
      },
    },
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nextStatus: string; note?: string },
  ) {
    return this.csService.updateStatus(id, body);
  }

  // ─────────────────────────────────────
  // 할일(Task) 관리
  // ─────────────────────────────────────

  @Post(':id/task')
  @ApiOperation({ summary: 'CS 할일(Task) 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['taskType'],
      properties: {
        taskType: { type: 'string', example: 'RETURN_STOCK_RESTORE', description: 'RETURN_STOCK_RESTORE | CANCEL_PROCESS | EXCHANGE_SHIP | OTHER' },
        note:     { type: 'string', example: '입고 후 재고 복구 처리 필요' },
      },
    },
  })
  addTask(@Param('id', ParseIntPipe) id: number, @Body() body: { taskType: string; note?: string }) {
    return this.csService.addTask(id, body);
  }

  @Patch('task/:taskId/done')
  @ApiOperation({ summary: 'CS 할일 완료 처리' })
  completeTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.csService.completeTask(taskId);
  }
}
