import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAlumbrado } from './dashboard-alumbrado';

describe('DashboardAlumbrado', () => {
  let component: DashboardAlumbrado;
  let fixture: ComponentFixture<DashboardAlumbrado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardAlumbrado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardAlumbrado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
