import { TestBed } from '@angular/core/testing';

import { CuadrillasService } from './cuadrillas-service';

describe('CuadrillasService', () => {
  let service: CuadrillasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuadrillasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
