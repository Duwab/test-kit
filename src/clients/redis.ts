/**
 * Redis Test Client
 */

import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import { BaseTestClient, ClientCredentials, BaseClientOptions, DumpSnapshot, SnapshotOptions } from '../base';

export interface RedisKeyInfo {
  key: string;
  type: string;
  ttl: number;
  size?: number;
}

export interface RedisDBStats {
  db: number;
  keys: number;
  expires: number;
  avgTtl: number;
}

export class RedisClient extends BaseTestClient {
  private client: Redis | null = null;

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    await this.retry(async () => {
      this.client = new Redis({
        host: this.credentials.host || 'localhost',
        port: this.credentials.port || 6379,
        password: this.credentials.password,
        db: this.credentials.db || 0,
        connectTimeout: this.options.timeout || 5000,
      });

      // Test connection
      await this.client.ping();
      this.isConnected = true;
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.isConnected = false;
  }

  /**
   * Get the official ioredis client
   */
  async getOfficialClient(): Promise<Redis> {
    if (!this.client) {
      await this.connect();
    }
    return this.client!;
  }

  /**
   * Get all keys with their information
   */
  async getAllKeys(pattern: string = '*'): Promise<RedisKeyInfo[]> {
    const client = await this.getOfficialClient();
    const keys = await client.keys(pattern);
    const keyInfos: RedisKeyInfo[] = [];

    for (const key of keys) {
      const type = await client.type(key);
      const ttl = await client.ttl(key);

      keyInfos.push({
        key,
        type,
        ttl: ttl >= 0 ? ttl : -1,
      });
    }

    return keyInfos;
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    const client = await this.getOfficialClient();
    return client.get(key);
  }

  /**
   * Get all keys by pattern
   */
  async getAllByPattern(pattern: string): Promise<Record<string, string>> {
    const client = await this.getOfficialClient();
    const keys = await client.keys(pattern);
    const result: Record<string, string> = {};

    for (const key of keys) {
      const value = await client.get(key);
      if (value) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Set a value
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = await this.getOfficialClient();
    if (ttl) {
      await client.setex(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  }

  /**
   * Delete keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    const client = await this.getOfficialClient();
    const keys = await client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return client.del(...keys);
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<number> {
    const client = await this.getOfficialClient();
    return client.del(key);
  }

  /**
   * Flush the entire database
   */
  async flushDB(): Promise<void> {
    const client = await this.getOfficialClient();
    await client.flushdb();
  }

  /**
   * Flush all databases
   */
  async flushAll(): Promise<void> {
    const client = await this.getOfficialClient();
    await client.flushall();
  }

  /**
   * Get database statistics
   */
  async getDBStats(): Promise<RedisDBStats> {
    const client = await this.getOfficialClient();
    const info = await client.info('stats');
    const keys = await client.dbsize();

    return {
      db: this.credentials.db || 0,
      keys,
      expires: 0, // Would need to compute this
      avgTtl: 0,
    };
  }

  /**
   * Get all data
   */
  async getAllData(): Promise<Record<string, string>> {
    return this.getAllByPattern('*');
  }

  /**
   * Dump Redis state to a file
   */
  async dump(filepath: string, options?: SnapshotOptions): Promise<void> {
    const client = await this.getOfficialClient();
    const data = await this.getAllData();

    const snapshot: DumpSnapshot = {
      timestamp: Date.now(),
      provider: 'redis',
      version: '1.0',
      data: [
        {
          type: 'data',
          timestamp: Date.now(),
          data: {
            db: this.credentials.db || 0,
            keys: data,
          },
        },
      ],
    };

    const content = options?.pretty ? JSON.stringify(snapshot, null, 2) : JSON.stringify(snapshot);
    const dir = path.dirname(filepath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, content);
  }

  /**
   * Restore Redis state from a file
   */
  async restore(filepath: string): Promise<void> {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Snapshot file not found: ${filepath}`);
    }

    const snapshot = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as DumpSnapshot;
    const data = snapshot.data[0]?.data?.keys;

    if (!data) {
      throw new Error('Invalid snapshot format');
    }

    const client = await this.getOfficialClient();

    // Flush before restoring
    await this.flushDB();

    // Restore data
    for (const [key, value] of Object.entries(data)) {
      await client.set(key, value as string);
    }
  }
}
