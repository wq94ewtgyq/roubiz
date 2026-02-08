// src/client/client.controller.ts
import { Controller, Patch, Param, Body, Get, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

const prisma = new PrismaClient();

@ApiTags('Client (고객사/판매처 관리)')
@Controller('client')
export class ClientController {

  // [1] Client 목록 조회
  @Get()
  @ApiOperation({ summary: '전체 Client 목록 조회' })
  async findAll() {
    return await prisma.client.findMany();
  }

  // [2] Client 생성 (기초 데이터용)
  @Post()
  @ApiOperation({ summary: '신규 Client 등록' })
  async create(@Body() body: { businessId: number, name: string, code?: string }) {
    return await prisma.client.create({
      data: {
        businessId: body.businessId,
        name: body.name,
        code: body.code
      }
    });
  }

  // [3] 운송장 회신 양식 설정 (핵심 기능!)
  @Patch(':id/waybill-format')
  @ApiOperation({ summary: 'Client별 운송장 회신(다운로드) 양식 설정' })
  @ApiBody({
    schema: {
      type: 'object',
      example: {
        "주문번호": "clientOrder.clientOrderNo",
        "택배사": "carrier.name",
        "송장번호": "trackingNumber"
      },
      description: 'Key: 엑셀헤더명, Value: 데이터경로'
    }
  })
  async updateWaybillFormat(@Param('id') id: string, @Body() format: any) {
    return await prisma.client.update({
      where: { id: Number(id) },
      data: {
        waybillFormat: format // 여기에 JSON으로 저장됩니다.
      }
    });
  }
}