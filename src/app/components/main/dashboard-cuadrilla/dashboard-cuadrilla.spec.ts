import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCuadrilla } from './dashboard-cuadrilla';

describe('DashboardCuadrilla', () => {
  let component: DashboardCuadrilla;
  let fixture: ComponentFixture<DashboardCuadrilla>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCuadrilla]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardCuadrilla);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
