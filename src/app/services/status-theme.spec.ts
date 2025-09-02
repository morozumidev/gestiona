import { TestBed } from '@angular/core/testing';

import { StatusTheme } from './status-theme';

describe('StatusTheme', () => {
  let service: StatusTheme;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusTheme);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
