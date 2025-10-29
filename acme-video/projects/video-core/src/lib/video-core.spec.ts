import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoCore } from './video-core';

describe('VideoCore', () => {
  let component: VideoCore;
  let fixture: ComponentFixture<VideoCore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VideoCore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoCore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
