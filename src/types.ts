/**
 * Type definitions for test snapshots
 */

export namespace TestKit {
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

  export interface Snapshot {
    timestamp: number;
    provider: 'rabbitmq' | 'redis' | 'elasticsearch';
    version: string;
    data: unknown;
  }

  // RabbitMQ Types
  export interface RabbitMQQueueStats {
    name: string;
    messageCount: number;
    consumerCount: number;
    ready: number;
    unacked: number;
  }

  export interface RabbitMQExchange {
    name: string;
    type: string;
    durable: boolean;
    autoDelete: boolean;
  }

  export interface RabbitMQBinding {
    exchange: string;
    queue: string;
    routingKey: string;
  }

  // Redis Types
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

  // Elasticsearch Types
  export interface ElasticsearchIndexStats {
    name: string;
    docCount: number;
    sizeInBytes: number;
    status: string;
  }

  export interface ElasticsearchIndexMapping {
    index: string;
    mapping: Record<string, any>;
  }

  export interface ElasticsearchSearchQuery {
    index: string;
    size?: number;
    query?: Record<string, any>;
  }
}
