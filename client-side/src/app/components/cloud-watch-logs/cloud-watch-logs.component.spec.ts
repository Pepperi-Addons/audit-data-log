import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloudWatchLogsComponent } from './cloud-watch-logs.component';

describe('CloudWatchLogsComponent', () => {
  let component: CloudWatchLogsComponent;
  let fixture: ComponentFixture<CloudWatchLogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CloudWatchLogsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CloudWatchLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
