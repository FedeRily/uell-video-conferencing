import { Injectable, signal, WritableSignal } from '@angular/core';
import type * as OT from '@opentok/client';
import type { TokboxCredentials } from '@acme/video-core';
import { TokboxSessionManager, createTokboxManager } from '@acme/video-core';

@Injectable({ providedIn: 'root' })
export class VideoCallService {
  private manager: TokboxSessionManager = createTokboxManager();

  readonly isConnected: WritableSignal<boolean> = signal(false);

  async connect(credentials: TokboxCredentials): Promise<void> {
    await this.manager.connect(credentials);
    this.isConnected.set(true);
  }

  async disconnect(): Promise<void> {
    await this.manager.disconnect();
    this.isConnected.set(false);
  }

  async startPublishing(container?: HTMLElement): Promise<void> {
    await this.manager.publish({ container });
  }

  async stopPublishing(): Promise<void> {
    await this.manager.unpublish();
  }

  async subscribe(stream: OT.Stream, options?: { container?: HTMLElement }): Promise<void> {
    await this.manager.subscribe(stream, { container: options?.container });
  }

  onStreamCreated(listener: (stream: OT.Stream) => void): () => void {
    return this.manager.on('streamCreated', listener);
  }

  onStreamDestroyed(listener: (stream: OT.Stream) => void): () => void {
    return this.manager.on('streamDestroyed', listener);
  }
}
