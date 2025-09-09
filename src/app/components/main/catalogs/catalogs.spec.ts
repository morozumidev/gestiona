import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Catalogs } from './catalogs';

describe('Catalogs', () => {
  let component: Catalogs;
  let fixture: ComponentFixture<Catalogs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Catalogs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Catalogs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
