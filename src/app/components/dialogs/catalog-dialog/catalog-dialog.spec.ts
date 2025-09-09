import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogDialog } from './catalog-dialog';

describe('CatalogDialog', () => {
  let component: CatalogDialog;
  let fixture: ComponentFixture<CatalogDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CatalogDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
