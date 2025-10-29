import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoAngular } from './video-angular';

describe('VideoAngular', () => {
  let component: VideoAngular;
  let fixture: ComponentFixture<VideoAngular>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoAngular]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoAngular);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
