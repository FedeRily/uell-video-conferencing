import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoCallService } from '../video-call';

@Component({
  selector: 'acme-video-call',
  imports: [CommonModule],
  template: `
    <div class="acme-video-call">
      <div class="local" #localContainer></div>
      <div class="remotes" #remotesContainer></div>
    </div>
  `,
  styles: `
    .acme-video-call { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .local { background: #111; min-height: 180px; }
    .remotes { background: #000; min-height: 180px; }
    :host { display: block; width: 100%; }
  `,
})
export class VideoCallComponent implements OnInit, OnDestroy {
  @Input({ required: true }) apiKey!: string;
  @Input({ required: true }) sessionId!: string;
  @Input({ required: true }) token!: string;
  @Input() autoConnect = true;
  @Input() autoPublish = true;

  @ViewChild('localContainer', { static: true }) localContainer!: ElementRef<HTMLElement>;
  @ViewChild('remotesContainer', { static: true }) remotesContainer!: ElementRef<HTMLElement>;

  private unsubscribers: Array<() => void> = [];

  constructor(private readonly call: VideoCallService) {}

  async ngOnInit(): Promise<void> {
    if (this.autoConnect) {
      await this.call.connect({ apiKey: this.apiKey, sessionId: this.sessionId, token: this.token });
      if (this.autoPublish) {
        await this.call.startPublishing(this.localContainer.nativeElement);
      }
    }

    this.unsubscribers.push(
      this.call.onStreamCreated((stream) => {
        const container = document.createElement('div');
        container.setAttribute('data-stream-id', stream.streamId);
        this.remotesContainer.nativeElement.appendChild(container);
        // Subscribe renders video into the container
        void this.call.subscribe(stream, { container });
      }),
      this.call.onStreamDestroyed((stream) => {
        // Remove the subscriber container if present
        const el = this.remotesContainer.nativeElement.querySelector(`[data-stream-id="${stream.streamId}"]`);
        el?.remove();
      }),
    );
  }

  async ngOnDestroy(): Promise<void> {
    this.unsubscribers.forEach((u) => u());
    await this.call.stopPublishing();
    await this.call.disconnect();
  }
}
