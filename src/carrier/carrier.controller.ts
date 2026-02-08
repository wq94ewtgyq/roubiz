// src/carrier/carrier.controller.ts
import { Controller, Post, Patch, Get, Body, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@ApiTags('Carrier (택배사 및 배송수단 관리)')
@Controller('carrier')
export class CarrierController {

  // [1] 택배사 등록 (표준코드 & 그룹 지정)
  @Post()
  @ApiOperation({ summary: '택배사/배송수단 등록 (그룹 지정 포함)' })
  async createCarrier(@Body() dto: { code: string, name: string, type: string }) {
    // type 예시: PARCEL(택배), DIRECT(직접), FREIGHT(화물), QUICK(퀵)
    const exists = await prisma.carrier.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException('이미 존재하는 코드입니다.');

    return await prisma.carrier.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type || 'PARCEL'
      }
    });
  }

  // [2] 택배사 수정 (이름, 그룹, 사용여부 변경)
  @Patch(':id')
  @ApiOperation({ summary: '택배사 정보 수정' })
  async updateCarrier(@Param('id') id: string, @Body() dto: { name?: string, type?: string, active?: boolean }) {
    return await prisma.carrier.update({
      where: { id: +id },
      data: dto
    });
  }

  // [3] 매핑 별칭 추가 ("경동" -> "KD" 매핑)
  @Post('mapping')
  @ApiOperation({ summary: '엑셀 인식용 별칭 추가' })
  async addMapping(@Body() dto: { carrierId: number, alias: string }) {
    // 공백 제거 및 소문자 통일 등 전처리 후 저장 추천
    const safeAlias = dto.alias.trim(); 
    return await prisma.carrierMapping.create({
      data: {
        carrierId: dto.carrierId,
        alias: safeAlias
      }
    });
  }

  // [4] 전체 목록 조회 (그룹별 확인용)
  @Get()
  @ApiOperation({ summary: '전체 택배사 목록 조회 (매핑 포함)' })
  async findAll() {
    return await prisma.carrier.findMany({
      include: { mappings: true },
      orderBy: { type: 'asc' } // 그룹별로 정렬
    });
  }
}