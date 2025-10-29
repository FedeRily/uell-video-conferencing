import type * as OT from '@opentok/client';

export type TokboxCredentials = {
  apiKey: string;
  sessionId: string;
  token: string;
};

export type LocalPublisherOptions = Partial<OT.PublisherProperties> & {
  container?: HTMLElement | null;
};

export type SubscriberOptions = Partial<OT.SubscriberProperties> & {
  container?: HTMLElement | null;
};

export type VideoCallEventMap = {
  connected: void;
  disconnected: void;
  error: Error;
  streamCreated: OT.Stream;
  streamDestroyed: OT.Stream;
  sessionReconnecting: void;
  sessionReconnected: void;
};

export type VideoCallEventName = keyof VideoCallEventMap;

export interface VideoCallEventListener<T extends VideoCallEventName> {
  (payload: VideoCallEventMap[T]): void;
}

export class TokboxSessionManager {
  private ot?: typeof OT;
  private session?: OT.Session;
  private publisher?: OT.Publisher;
  private subscribers: Map<string, OT.Subscriber> = new Map();
  private listeners: { [K in VideoCallEventName]: Set<VideoCallEventListener<K>> } = {
    connected: new Set(),
    disconnected: new Set(),
    error: new Set(),
    streamCreated: new Set(),
    streamDestroyed: new Set(),
    sessionReconnecting: new Set(),
    sessionReconnected: new Set(),
  } as any;

  constructor(private log: (message: string, data?: unknown) => void = () => {}) {}

  on<T extends VideoCallEventName>(event: T, listener: VideoCallEventListener<T>): () => void {
    (this.listeners[event] as unknown as Set<(p: unknown) => void>).add(
      listener as unknown as (p: unknown) => void,
    );
    return () => {
      (this.listeners[event] as unknown as Set<(p: unknown) => void>).delete(
        listener as unknown as (p: unknown) => void,
      );
    };
  }

  private emit<T extends VideoCallEventName>(event: T, payload: VideoCallEventMap[T]): void {
    (this.listeners[event] as unknown as Set<(p: unknown) => void>).forEach((l) => {
      try {
        (l as (p: unknown) => void)(payload);
      } catch (e) {
        this.log(`Listener for ${event} threw`, e);
      }
    });
  }

  get isConnected(): boolean {
    return !!this.session && this.session.connection !== undefined;
  }

  async connect(credentials: TokboxCredentials): Promise<void> {
    const ot = await this.ensureOpentok();
    if (this.session) {
      await this.disconnect();
    }
    this.session = ot.initSession(credentials.apiKey, credentials.sessionId);

    this.session.on('streamCreated', (event) => {
      this.emit('streamCreated', event.stream);
    });
    this.session.on('streamDestroyed', (event) => {
      this.emit('streamDestroyed', event.stream);
    });
    this.session.on('sessionReconnecting', () => this.emit('sessionReconnecting', undefined));
    this.session.on('sessionReconnected', () => this.emit('sessionReconnected', undefined));

    await new Promise<void>((resolve, reject) => {
      this.session!.connect(credentials.token, (err) => {
        if (err) {
          this.emit('error', err);
          reject(err);
        } else {
          this.emit('connected', undefined);
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.session) return;

    try {
      const session = this.session;
      this.subscribers.forEach((s) => {
        try { session?.unsubscribe(s); } catch {}
      });
      this.subscribers.clear();
      if (this.publisher) {
        try {
          this.publisher.destroy();
        } catch {}
        this.publisher = undefined;
      }
      this.session.disconnect();
    } finally {
      this.session = undefined;
      this.emit('disconnected', undefined);
    }
  }

  async publish(options: LocalPublisherOptions = {}): Promise<OT.Publisher> {
    const ot = await this.ensureOpentok();
    if (!this.session) throw new Error('Session not connected');
    if (this.publisher) return this.publisher;

    const container = options.container ?? undefined;
    const { container: _c, ...publisherOptions } = options;

    this.publisher = ot.initPublisher(container as any, publisherOptions);

    return await new Promise<OT.Publisher>((resolve, reject) => {
      this.session!.publish(this.publisher!, (err) => {
        if (err) {
          this.emit('error', err);
          reject(err);
        } else {
          resolve(this.publisher!);
        }
      });
    });
  }

  async unpublish(): Promise<void> {
    if (!this.session || !this.publisher) return;
    try {
      this.session.unpublish(this.publisher);
    } finally {
      try {
        this.publisher.destroy();
      } catch {}
      this.publisher = undefined;
    }
  }

  async subscribe(stream: OT.Stream, options: SubscriberOptions = {}): Promise<OT.Subscriber> {
    if (!this.session) throw new Error('Session not connected');
    const container = options.container ?? undefined;
    const { container: _c, ...subscriberOptions } = options;

    const subscriber = this.session.subscribe(stream, container as any, subscriberOptions);
    this.subscribers.set(stream.streamId, subscriber);
    return subscriber;
  }

  unsubscribe(streamId: string): void {
    const sub = this.subscribers.get(streamId);
    if (!sub) return;
    try {
      this.session?.unsubscribe(sub);
    } finally {
      this.subscribers.delete(streamId);
    }
  }

  attachPublisher(container: HTMLElement): void {
    if (!this.publisher || !container) return;
    const el = this.publisher.element as HTMLElement | undefined;
    if (!el) return;
    try {
      container.appendChild(el);
    } catch {}
  }

  private async ensureOpentok(): Promise<typeof OT> {
    if (typeof window === 'undefined') {
      throw new Error('TokBox Web SDK only available in the browser environment');
    }
    if (this.ot) return this.ot;
    const mod = await import(/* webpackIgnore: true */ '@opentok/client');
    this.ot = (mod as unknown as { default: typeof OT }).default ?? (mod as any);
    return this.ot!;
  }
}

export const createTokboxManager = (logger?: (message: string, data?: unknown) => void) =>
  new TokboxSessionManager(logger);
