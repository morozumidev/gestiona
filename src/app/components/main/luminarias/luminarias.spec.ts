import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Luminarias } from './luminarias';
import { CatalogsService } from '../../../services/catalog-service';

describe('Luminarias', () => {
  let component: Luminarias;
  let fixture: ComponentFixture<Luminarias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Luminarias],
      providers: [
        {
          provide: CatalogsService,
          useValue: { getLuminariasOverview: () => of([]) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Luminarias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
