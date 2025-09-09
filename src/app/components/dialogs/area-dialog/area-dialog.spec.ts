import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaDialog } from './area-dialog';

describe('AreaDialog', () => {
  let component: AreaDialog;
  let fixture: ComponentFixture<AreaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AreaDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
