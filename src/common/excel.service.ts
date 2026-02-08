import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelService {

  // [엑셀 읽기] Buffer -> JSON 배열
  readExcel(buffer: Buffer): any[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // 첫 번째 시트만 읽음
      const sheet = workbook.Sheets[sheetName];
      
      // 첫 줄(헤더)을 키값으로 JSON 변환
      return XLSX.utils.sheet_to_json(sheet);
    } catch (error) {
      throw new BadRequestException('엑셀 파일 형식이 올바르지 않습니다.');
    }
  }

  // [NEW] [엑셀 쓰기] JSON 배열 -> Buffer (파일 다운로드용)
  writeExcel(data: any[], sheetName: string = '발주서'): Buffer {
    // 1. JSON 데이터를 워크시트로 변환
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 2. 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 3. 워크북에 시트 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 4. 버퍼로 변환하여 반환
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}