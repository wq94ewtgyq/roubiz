// src/order/order.controller.ts
import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelService } from '../common/excel.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@ApiTags('Order (주문 수집)')
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

  // [NEW] 자동 인식 업로드
  @Post('upload')
  @ApiOperation({ summary: '엑셀 자동 인식 업로드 (파일명 기반)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '파일명에 판매처 키워드가 포함되어야 함 (예: 260206_쿠팡_매출.xlsx)'
        }
      },
    },
  })
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    // ---------------------------------------------------------
    // [1. 파일명 자동 인식 로직]
    // ---------------------------------------------------------
    
    // 1-1. 한글 파일명 깨짐 방지
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    console.log(`📂 업로드된 파일명: ${originalName}`);

    // 1-2. [수정됨] 등록된 판매처(BusinessRole) 가져오기
    // 조건: 판매처이면서(isSalesChannel=true) 키워드가 등록된 것들
    const channels = await prisma.businessRole.findMany({
      where: { 
        isSalesChannel: true,
        recognitionKeyword: { not: null } 
      }
    });

    // 1-3. 파일명에서 키워드 찾기
    // 'as string'을 붙여서 null이 아님을 보장합니다.
    const matchedChannel = channels.find(c => originalName.includes(c.recognitionKeyword as string));

    if (!matchedChannel) {
      throw new BadRequestException(
        `❌ 파일명(${originalName})에서 인식할 수 있는 판매처 키워드를 못 찾았습니다. (등록된 키워드: ${channels.map(c => c.recognitionKeyword).join(', ')})`
      );
    }

    console.log(`✅ 인식 성공! 판매처: ${matchedChannel.businessName} (유형: ${matchedChannel.salesGroup})`);

    // ---------------------------------------------------------
    // [2. 엑셀 파싱 및 저장]
    // ---------------------------------------------------------
    const rows = this.excelService.readExcel(file.buffer);
    const results: any[] = []; 

    for (const row of rows) {
      const dto = new CreateOrderDto();
      
      // [수정됨] 인식된 채널명(businessName)을 주입
      dto.channelName = matchedChannel.businessName; 
      
      // 엑셀 컬럼 매핑 (없으면 기본값 생성)
      dto.orderNo = row['주문번호'] ? String(row['주문번호']) : `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      dto.productCode = row['상품코드'] ? String(row['상품코드']) : 'UNKNOWN';
      dto.optionName = row['옵션명'] ? String(row['옵션명']) : '';
      dto.quantity = Number(row['수량'] || 1);
      dto.price = Number(row['판매가'] || 0);

      try {
        const res = await this.orderService.create(dto);
        results.push({ 
            orderNo: dto.orderNo, 
            status: 'SUCCESS', 
            msg: res.matchResult, // Service에서 리턴해주는 메시지
            systemOrderNo: res.systemOrderNo // 시스템 주문번호 확인용
        });
      } catch (e) {
        results.push({ 
            orderNo: dto.orderNo, 
            status: 'FAIL', 
            msg: e.message 
        });
      }
    }

    return {
      message: `[${matchedChannel.businessName}] 주문 업로드 완료`,
      recognizedAs: matchedChannel.businessName,
      salesGroup: matchedChannel.salesGroup, // ST/DT 정보 리턴
      fileName: originalName,
      total: rows.length,
      successCount: results.filter(r => r.status === 'SUCCESS').length,
      failCount: results.filter(r => r.status === 'FAIL').length,
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