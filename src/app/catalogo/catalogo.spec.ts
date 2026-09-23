import { storefrontTestProviders } from '../testing/storefront.providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Catalogo } from './catalogo';

describe('Catalogo', () => {
  let component: Catalogo;
  let fixture: ComponentFixture<Catalogo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: storefrontTestProviders(),
      imports: [Catalogo],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalogo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

