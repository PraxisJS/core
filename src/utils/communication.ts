import { signal, Signal } from '../core/signal.js';
import { effect } from '../core/effect.js';

// Event Bus for typed events
export interface EventMap {
  [key: string]: any;
}

export interface EventBusListener<T = any> {
  (payload: T): void;
}

export interface EventBusOptions {
  maxListeners?: number;
  enableWildcard?: boolean;
}

export class EventBus<TEventMap extends EventMap = EventMap> {
  private listeners = new Map<keyof TEventMap, Set<EventBusListener>>();
  private onceListeners = new Map<keyof TEventMap, Set<EventBusListener>>();
  private wildcardListeners = new Set<(event: string, payload: any) => void>();
  private options: Required<EventBusOptions>;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxListeners: 100,
      enableWildcard: false,
      ...options
    };
  }

  on<K extends keyof TEventMap>(
    event: K,
    listener: EventBusListener<TEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const eventListeners = this.listeners.get(event)!;
    
    if (eventListeners.size >= this.options.maxListeners) {
      console.warn(`Maximum number of listeners (${this.options.maxListeners}) reached for event: ${String(event)}`);
    }

    eventListeners.add(listener);

    return () => this.off(event, listener);
  }

  once<K extends keyof TEventMap>(
    event: K,
    listener: EventBusListener<TEventMap[K]>
  ): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }

    this.onceListeners.get(event)!.add(listener);

    return () => {
      const onceListeners = this.onceListeners.get(event);
      if (onceListeners) {
        onceListeners.delete(listener);
      }
    };
  }

  off<K extends keyof TEventMap>(
    event: K,
    listener: EventBusListener<TEventMap[K]>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }

    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      onceListeners.delete(listener);
      if (onceListeners.size === 0) {
        this.onceListeners.delete(event);
      }
    }
  }

  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
    // Regular listeners
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }

    // Once listeners
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      const listeners = Array.from(onceListeners);
      onceListeners.clear();
      this.onceListeners.delete(event);
      
      listeners.forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in once listener for ${String(event)}:`, error);
        }
      });
    }

    // Wildcard listeners
    if (this.options.enableWildcard) {
      this.wildcardListeners.forEach(listener => {
        try {
          listener(String(event), payload);
        } catch (error) {
          console.error(`Error in wildcard listener:`, error);
        }
      });
    }
  }

  onWildcard(listener: (event: string, payload: any) => void): () => void {
    if (!this.options.enableWildcard) {
      throw new Error('Wildcard listeners are not enabled. Set enableWildcard: true in options.');
    }

    this.wildcardListeners.add(listener);
    return () => this.wildcardListeners.delete(listener);
  }

  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
    this.wildcardListeners.clear();
  }

  getListenerCount<K extends keyof TEventMap>(event: K): number {
    const regular = this.listeners.get(event)?.size || 0;
    const once = this.onceListeners.get(event)?.size || 0;
    return regular + once;
  }

  getAllEvents(): Array<keyof TEventMap> {
    const events = new Set<keyof TEventMap>();
    this.listeners.forEach((_, event) => events.add(event));
    this.onceListeners.forEach((_, event) => events.add(event));
    return Array.from(events);
  }
}

// Global event bus
export const globalEventBus = new EventBus({ enableWildcard: true });

// WebSocket integration
export interface WebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class ReactiveWebSocket {
  public readonly connected: Signal<boolean>;
  public readonly error: Signal<Error | null>;
  public readonly lastMessage: Signal<any>;
  
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private messageHandlers = new Map<string, Set<(data: any) => void>>();

  constructor(
    private url: string,
    private options: WebSocketOptions = {}
  ) {
    this.connected = signal(false);
    this.error = signal<Error | null>(null);
    this.lastMessage = signal<any>(null);
    
    this.options = {
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options
    };
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      this.error.value = error as Error;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected.value = false;
  }

  send(type: string, data?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data });
      this.ws.send(message);
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  on(type: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.connected.value = true;
      this.error.value = null;
      this.reconnectAttempts = 0;
      
      if (this.options.heartbeatInterval) {
        this.startHeartbeat();
      }
    };

    this.ws.onclose = () => {
      this.connected.value = false;
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      if (this.options.autoReconnect && 
          this.reconnectAttempts < this.options.maxReconnectAttempts!) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      this.error.value = new Error('WebSocket error');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.lastMessage.value = message;
        
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message.data);
            } catch (error) {
              console.error(`Error in WebSocket message handler:`, error);
            }
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval! * this.reconnectAttempts;
    
    this.reconnectTimer = window.setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping');
      }
    }, this.options.heartbeatInterval!);
  }
}

// BroadcastChannel for cross-tab communication
export class ReactiveChannelDual {
  public readonly lastMessage: Signal<any>;
  public readonly connected: Signal<boolean>;
  
  private channel: BroadcastChannel | null = null;
  private messageHandlers = new Map<string, Set<(data: any) => void>>();

  constructor(private channelName: string) {
    this.lastMessage = signal<any>(null);
    this.connected = signal(false);
    
    this.connect();
  }

  connect(): void {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel is not supported in this environment');
      return;
    }

    try {
      this.channel = new BroadcastChannel(this.channelName);
      this.connected.value = true;
      
      this.channel.onmessage = (event) => {
        this.lastMessage.value = event.data;
        
        const handlers = this.messageHandlers.get(event.data.type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(event.data.payload);
            } catch (error) {
              console.error(`Error in BroadcastChannel message handler:`, error);
            }
          });
        }
      };
    } catch (error) {
      console.error('Failed to create BroadcastChannel:', error);
    }
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.connected.value = false;
  }

  send(type: string, payload?: any): void {
    if (this.channel) {
      this.channel.postMessage({ type, payload, timestamp: Date.now() });
    }
  }

  on(type: string, handler: (payload: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }
}

// Store sync across tabs
export function createCrossTabStore<T>(
  channelName: string,
  initialState: T
): { state: Signal<T>; broadcast: (state: T) => void } {
  const state = signal(initialState);
  const channel = new ReactiveChannelDual(channelName);
  
  // Listen for updates from other tabs
  channel.on('state-update', (newState: T) => {
    state.value = newState;
  });
  
  // Broadcast state changes to other tabs
  const broadcast = (newState: T) => {
    channel.send('state-update', newState);
  };
  
  // Auto-broadcast when state changes
  effect(() => {
    broadcast(state.value);
  });
  
  return { state, broadcast };
}

// Utility functions
export function createEventBus<T extends EventMap>(): EventBus<T> {
  return new EventBus<T>();
}

export function createWebSocket(url: string, options?: WebSocketOptions): ReactiveWebSocket {
  return new ReactiveWebSocket(url, options);
}

export function createBroadcastChannel(name: string): ReactiveChannelDual {
  return new ReactiveChannelDual(name);
}