import { TestBed } from '@angular/core/testing';

import { TicketsService } from './tickets-service';

describe('ReportsService', () => {
  let service: TicketsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TicketsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
