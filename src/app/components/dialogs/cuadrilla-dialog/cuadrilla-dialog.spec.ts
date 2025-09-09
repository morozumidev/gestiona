import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CuadrillaDialog } from './cuadrilla-dialog';

describe('CuadrillaDialog', () => {
  let component: CuadrillaDialog;
  let fixture: ComponentFixture<CuadrillaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuadrillaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CuadrillaDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
