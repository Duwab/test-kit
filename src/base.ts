/**
 * Base interfaces and types for test-kit clients
 */

export interface ClientCredentials {
  host: string;
  port: number;
  username?: string;
  password?: string;
  vhost?: string;
  db?: number;
  [key: string]: any;
}

export interface BaseClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface SnapshotOptions {
  pretty?: boolean;
  compress?: boolean;
}

export interface ResourceState {
  type: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface DumpSnapshot {
  timestamp: number;
  provider: string;
  version: string;
  data: ResourceState[];
}

/**
 * Base class for all clients
 */
export abstract class BaseTestClient {
  protected credentials: ClientCredentials;
  protected options: BaseClientOptions;
  protected isConnected: boolean = false;

  constructor(credentials: ClientCredentials, options: BaseClientOptions = {}) {
    this.credentials = credentials;
    this.options = {
      timeout: 5000,
      retries: 3,
      retryDelay: 100,
      ...options,
    };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract dump(filepath: string, options?: SnapshotOptions): Promise<void>;
  abstract restore(filepath: string): Promise<void>;

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.options.retries || 3,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await this.sleep(this.options.retryDelay || 100);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}
