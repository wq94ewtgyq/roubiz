import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
// [1] 엑셀 서비스 파일을 불러옵니다.
import { ExcelService } from '../common/excel.service';

@Module({
  controllers: [OrderController],
  // [2] providers 배열에 ExcelService를 추가합니다.
  providers: [OrderService, ExcelService], 
})
export class OrderModule {}