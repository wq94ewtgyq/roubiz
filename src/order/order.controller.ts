import { Controller, Post, Body, UploadedFile, UseInterceptors, Get, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExcelService } from '../common/excel.service'; 

@ApiTags('주문(Order)')
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly excelService: ExcelService 
  ) {}

  @Post()
  @ApiOperation({ summary: '주문 수집 (엑셀 업로드)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        channelName: { type: 'string', example: '테스트스토어' }
      },
    },
  })
  async uploadOrder(@UploadedFile() file: Express.Multer.File, @Body() body: { channelName: string }) {
    if (!file) throw new BadRequestException('파일이 없습니다.');
    
    const rows = this.excelService.readExcel(file.buffer);
    
    // [수정] TS2345 에러 해결을 위해 타입을 any[]로 명시
    const results: any[] = [];
    const errors: any[] = [];

    for (const [index, row] of rows.entries()) {
        try {
            const dto: CreateOrderDto = {
                channelName: body.channelName,
                orderNo: String(row['주문번호'] || row['OrderNo'] || `AUTO-${Date.now()}-${index}`),
                productCode: String(row['상품코드'] || row['ProductCode'] || ''),
                optionName: String(row['옵션'] || row['Option'] || '옵션없음'),
                quantity: Number(row['수량'] || row['Quantity'] || 1),
                price: Number(row['판매가'] || row['Price'] || 0)
            };
            
            if (!dto.productCode) throw new Error('상품코드 누락');
            
            const res = await this.orderService.create(dto);
            results.push({ row: index + 1, status: 'SUCCESS', ...res });

        } catch (e) {
            errors.push({ row: index + 1, status: 'FAIL', message: e.message });
        }
    }

    return { 
        total: rows.length, 
        success: results.length, 
        fail: errors.length, 
        results, 
        errors 
    };
  }

  // [수기 등록 테스트용]
  @Post('manual')
  @ApiOperation({ summary: '주문 수기 등록 (테스트)' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  // [주문 확정] - Swagger 입력창 강제 생성
  @Post('confirm')
  @ApiOperation({ summary: '주문 확정 (PENDING -> READY)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roubizOrderIds: { 
          type: 'array', 
          items: { type: 'number' }, 
          example: [1] 
        }
      }
    }
  })
  confirm(@Body() body: { roubizOrderIds: number[] }) {
    return this.orderService.confirmOrders(body.roubizOrderIds);
  }

  // [주문 보류] - Swagger 입력창 강제 생성
  @Post('hold')
  @ApiOperation({ summary: '주문 보류' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roubizOrderIds: { type: 'array', items: { type: 'number' }, example: [1] },
        reason: { type: 'string', example: '고객 요청 보류' }
      }
    }
  })
  hold(@Body() body: { roubizOrderIds: number[], reason: string }) {
    return this.orderService.setHoldStatus({ ids: body.roubizOrderIds, reason: body.reason });
  }

  // [배송 전 취소]
  @Post('cancel')
  @ApiOperation({ summary: '배송 전 주문 취소 (WAREHOUSE: 할당 해제 / SUPPLIER: 상태 변경)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['roubizOrderIds', 'reason'],
      properties: {
        roubizOrderIds: { type: 'array', items: { type: 'number' }, example: [1] },
        reason: { type: 'string', example: '고객 요청 취소' },
      },
    },
  })
  cancel(@Body() body: { roubizOrderIds: number[]; reason: string }) {
    return this.orderService.cancelOrders({ ids: body.roubizOrderIds, reason: body.reason });
  }

  @Post('supplier-order')
  @ApiOperation({ summary: '위탁 발주 생성' })
  createSupplierOrders(@Body() dto: CreateSupplierOrderDto) {
    return this.orderService.createSupplierOrders(dto);
  }

  // [출고처 변경] - Swagger 입력창 강제 생성
  @Post('change-source')
  @ApiOperation({ summary: '출고처 변경' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roubizOrderIds: { type: 'array', items: { type: 'number' }, example: [1] },
        sourceType: { type: 'string', example: 'WAREHOUSE' },
        warehouseId: { type: 'number', example: 1 }
      }
    }
  })
  changeSource(@Body() body: { roubizOrderIds: number[], sourceType: 'SUPPLIER' | 'WAREHOUSE', warehouseId?: number }) {
    return this.orderService.changeOrderSource(body);
  }

  @Post('waybill')
  @ApiOperation({ summary: '운송장 일괄 등록' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' }
      }
    }
  })
  uploadWaybill(@UploadedFile() file: Express.Multer.File) {
    return this.orderService.uploadWaybill(file.buffer);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }
}