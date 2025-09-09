import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cuadrillas } from './cuadrillas';

describe('Cuadrillas', () => {
  let component: Cuadrillas;
  let fixture: ComponentFixture<Cuadrillas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cuadrillas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cuadrillas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
