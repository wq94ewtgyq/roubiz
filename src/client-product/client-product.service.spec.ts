import { Test, TestingModule } from '@nestjs/testing';
import { SalesProductService } from './sales-product.service';

describe('SalesProductService', () => {
  let service: SalesProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesProductService],
    }).compile();

    service = module.get<SalesProductService>(SalesProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
