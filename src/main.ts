// src/main.ts

// [1] 최상단에 시간대 설정 추가 (서버 전체에 KST 적용)
process.env.TZ = 'Asia/Seoul';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // [2] 스웨거(API 문서) 설정
  const config = new DocumentBuilder()
    .setTitle('ROUBIZ ERP API')
    .setDescription('PM님을 위한 ROUBIZ 시스템 API 명세서입니다.')
    .setVersion('1.0')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // 주소: /api

  // [3] 서버 실행
  await app.listen(3000);
}
bootstrap();