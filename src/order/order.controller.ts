// src/order/order.controller.ts
import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, Body, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express'; 
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelService } from '../common/excel.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@ApiTags('Order (주문 수집 & 발주)')
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly excelService: ExcelService
  ) {}

  @Post()
  @ApiOperation({ summary: '주문 1건 등록 (테스트용)' })
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: '주문 확정 (임시 -> 발주대기)' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { roubizOrderIds: { type: 'array', items: { type: 'number' }, example: [1, 2, 3] } } 
    } 
  })
  confirm(@Body('roubizOrderIds') ids: number[]) {
    return this.orderService.confirmOrders(ids);
  }

  // [NEW] 대시보드 조회 (3개 탭 데이터)
  @Get('dashboard')
  @ApiOperation({ summary: '발주 관제 대시보드 조회 (대기/보류/지정일 분류)' })
  getDashboard() {
    return this.orderService.getDispatchDashboard();
  }

  // [NEW] 보류 처리 (수동 / 다음차수)
  @Post('hold-request')
  @ApiOperation({ summary: '발주 보류 설정 (사유 필수)' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        roubizOrderIds: { type: 'array', items: { type: 'number' } },
        reason: { type: 'string', description: '보류 사유' },
        type: { type: 'string', enum: ['MANUAL', 'NEXT_ROUND'], description: '보류 타입' }
      } 
    } 
  })
  setHold(@Body() body: { roubizOrderIds: number[], reason: string, type: 'MANUAL' | 'NEXT_ROUND' }) {
    return this.orderService.setHoldStatus({ ids: body.roubizOrderIds, reason: body.reason, type: body.type });
  }

  // [NEW] 지정일 설정
  @Post('schedule-request')
  @ApiOperation({ summary: '지정일 배송 설정 (사유 필수)' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        roubizOrderIds: { type: 'array', items: { type: 'number' } },
        targetDate: { type: 'string', format: 'date', example: '2026-02-15' },
        reason: { type: 'string' }
      } 
    } 
  })
  setSchedule(@Body() body: { roubizOrderIds: number[], targetDate: string, reason: string }) {
    return this.orderService.setSchedule(body.roubizOrderIds, body.targetDate, body.reason);
  }

  @Post('generate-po')
  @ApiOperation({ summary: '발주서 생성 (발주대기 -> 발주완료)' })
  @ApiBody({ type: CreateSupplierOrderDto })
  generatePO(@Body() dto: CreateSupplierOrderDto) {
    return this.orderService.createSupplierOrders(dto);
  }

  @Post('cancel-po')
  @ApiOperation({ summary: '발주서 삭제 (출력 취소)' })
  @ApiBody({ schema: { type: 'object', properties: { supplierOrderId: { type: 'number' } } } })
  cancelPO(@Body('supplierOrderId') id: number) {
    return this.orderService.cancelSupplierOrder(id);
  }

  @Post('rollback')
  @ApiOperation({ summary: '주문 상태 복구 (발주완료 -> 발주대기)' })
  @ApiBody({ schema: { type: 'object', properties: { roubizOrderIds: { type: 'array', items: { type: 'number' } } } } })
  rollback(@Body('roubizOrderIds') ids: number[]) {
    return this.orderService.rollbackOrders(ids);
  }

  @Get('download-po/:id')
  @ApiOperation({ summary: '발주서 엑셀 다운로드' })
  async downloadPO(@Param('id') id: string, @Res() res: Response) {
    const order = await this.orderService.findSupplierOrder(+id);

    const excelData = order.items.map((item, index) => ({
      'No': index + 1,
      '발주번호': order.supplierOrderNo,
      '발주차수': `${order.round}차`,
      '매입처': order.supplier.name,
      '상품명': item.roubizProduct.name,
      '상품코드': item.roubizProduct.roubizCode,
      '발주수량': item.quantity,
      '공급단가': Number(item.unitCost),
      '합계금액': Number(item.unitCost) * item.quantity,
      '비고': ''
    }));

    const buffer = this.excelService.writeExcel(excelData);

    const formatConfig = (order.supplier.orderFormat as any) || {};
    const fileNamePattern = formatConfig.fileNamePattern || '{거래처명}_{발주차수}발주서_{발주일_단축}';

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateLong = `${yyyy}-${mm}-${dd}`;   
    const dateShort = `${yyyy.toString().slice(2)}${mm}${dd}`;

    const finalFileName = fileNamePattern
      .replace(/{발주일}/g, dateLong)
      .replace(/{발주일_단축}/g, dateShort)
      .replace(/{거래처명}/g, order.supplier.name)
      .replace(/{사업자명}/g, order.supplier.business.businessName)
      .replace(/{발주번호}/g, order.supplierOrderNo)
      .replace(/{발주차수}/g, `${order.round}차`);

    const encodedFileName = encodeURIComponent(`${finalFileName}.xlsx`);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodedFileName}"`,
    });
    res.send(buffer);
  }

  @Post('upload')
  @ApiOperation({ summary: '엑셀 업로드 (파일명 인식)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '파일명에 판매처명(예: 쿠팡) 필수 포함',
        },
      },
    },
  })
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    const channels = await prisma.salesChannel.findMany();
    const matchedChannel = channels.find(c => originalName.includes(c.name));

    if (!matchedChannel) {
      throw new BadRequestException(`❌ 파일명(${originalName})에서 판매처를 인식할 수 없습니다. (등록된 채널: ${channels.map(c => c.name).join(', ')})`);
    }

    const rows = this.excelService.readExcel(file.buffer);
    const results: any[] = []; 

    const mapping = (matchedChannel.excelMapping as any) || {
        orderNo: '주문번호',
        productCode: '상품코드',
        optionName: '옵션명',
        qty: '수량',
        price: '판매가'
    };

    for (const row of rows) {
      const dto = new CreateOrderDto();
      dto.channelName = matchedChannel.name; 
      
      dto.orderNo = row[mapping.orderNo] ? String(row[mapping.orderNo]) : `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      dto.productCode = row[mapping.productCode] ? String(row[mapping.productCode]) : 'UNKNOWN';
      dto.optionName = row[mapping.optionName] ? String(row[mapping.optionName]) : '';
      dto.quantity = Number(row[mapping.qty] || 1);
      dto.price = Number(row[mapping.price] || 0);

      try {
        const res = await this.orderService.create(dto);
        results.push({ 
            orderNo: dto.orderNo, 
            status: 'SUCCESS', 
            msg: res.matchResult,
            roubizOrderNo: res.roubizOrderNo 
        });
      } catch (e) {
        results.push({ orderNo: dto.orderNo, status: 'FAIL', msg: e.message });
      }
    }

    return {
      message: `[${matchedChannel.name}] 업로드 완료`,
      total: rows.length,
      successCount: results.filter(r => r.status === 'SUCCESS').length,
      details: results
    };
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(+id);
  }
}