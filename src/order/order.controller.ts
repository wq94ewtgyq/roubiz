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

  @Post('upload')
  @ApiOperation({ summary: '엑셀 자동 인식 업로드' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: '파일명에 판매처 키워드 포함' }
      },
    },
  })
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    const clients = await prisma.businessRole.findMany({
      where: { 
        isClient: true,
        recognitionKeyword: { not: null } 
      }
    });

    const matchedClient = clients.find(c => originalName.includes(c.recognitionKeyword as string));

    if (!matchedClient) {
      throw new BadRequestException(`❌ 파일명(${originalName}) 인식 실패.`);
    }

    const rows = this.excelService.readExcel(file.buffer);
    const results: any[] = []; 

    for (const row of rows) {
      const dto = new CreateOrderDto();
      dto.channelName = matchedClient.businessName; 
      dto.orderNo = row['주문번호'] ? String(row['주문번호']) : `AUTO-${Date.now()}`;
      dto.productCode = row['상품코드'] ? String(row['상품코드']) : 'UNKNOWN';
      dto.optionName = row['옵션명'] ? String(row['옵션명']) : '';
      dto.quantity = Number(row['수량'] || 1);
      dto.price = Number(row['판매가'] || 0);

      try {
        const res = await this.orderService.create(dto);
        results.push({ 
            orderNo: dto.orderNo, 
            status: 'SUCCESS', 
            msg: res.matchResult,
            // [해결] systemOrderNo 대신 서비스의 roubizOrderNo 사용
            roubizOrderNo: res.roubizOrderNo 
        });
      } catch (e) {
        results.push({ orderNo: dto.orderNo, status: 'FAIL', msg: e.message });
      }
    }

    return {
      message: `[${matchedClient.businessName}] 업로드 완료`,
      clientGroup: matchedClient.clientGroup, 
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