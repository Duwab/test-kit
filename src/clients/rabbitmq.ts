/**
 * RabbitMQ Test Client
 */

import * as amqp from 'amqplib';
import * as fs from 'fs';
import * as path from 'path';
import { BaseTestClient, DumpSnapshot, SnapshotOptions } from '../base';

export interface QueueStats {
  name: string;
  messageCount: number;
  consumerCount: number;
  ready: number;
  unacked: number;
}

export interface ExchangeInfo {
  name: string;
  type: string;
  durable: boolean;
  autoDelete: boolean;
}

export interface BindingInfo {
  exchange: string;
  queue: string;
  routingKey: string;
}

export class RabbitMQClient extends BaseTestClient {
  private connection: any = null;
  private channel: any = null;

  async connect(): Promise<void> {
    if (this.isConnected && this.connection) {
      return;
    }

    await this.retry(async () => {
      const url = this.buildConnectionUrl();
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;
    });
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this.isConnected = false;
  }

  /**
   * Get the official amqplib connection
   */
  async getOfficialClient(): Promise<amqp.Connection> {
    if (!this.connection) {
      await this.connect();
    }
    return this.connection!;
  }

  /**
   * Get the official amqplib channel
   */
  async getChannel(): Promise<amqp.Channel> {
    if (!this.channel) {
      await this.connect();
    }
    return this.channel!;
  }

  /**
   * Get all queues with their statistics
   */
  async getAllQueues(): Promise<QueueStats[]> {
    const queues: QueueStats[] = [];

    // FIXME: this isn't a "live" info (few seconds caching)
    //        → either change it here, or create another function
    const managementUrl = `http://${this.credentials.host}:15672/api/queues`;
    const auth = Buffer.from(
      `${this.credentials.username || 'guest'}:${this.credentials.password || 'guest'}`,
    ).toString('base64');

    try {
      const response = await fetch(managementUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) {
        throw new Error(`RabbitMQ Management API error: ${response.statusText}`);
      }

      const data = (await response.json()) as Array<{
        name: string;
        messages: number;
        messages_ready: number;
        messages_unacknowledged: number;
        consumers: number;
      }>;

      for (const queue of data) {
        queues.push({
          name: queue.name,
          messageCount: queue.messages || 0,
          consumerCount: queue.consumers || 0,
          ready: queue.messages_ready || 0,
          unacked: queue.messages_unacknowledged || 0,
        });
      }
    } catch (error) {
      throw new Error(`Failed to get queue stats: ${error}`);
    }

    return queues;
  }

  async deleteAllQueues(): Promise<void> {
    const queues = await this.getAllQueues();

    for (const queue of queues) {
      await this.deleteQueue(queue.name);
    }
  }

  /**
   * Get a specific queue statistics
   */
  async getQueueStats(queueName: string): Promise<QueueStats | null> {
    const queues = await this.getAllQueues();
    return queues.find((q) => q.name === queueName) || null;
  }

  /**
   * Purge a queue (delete all messages)
   */
  async purgeQueue(queueName: string): Promise<void> {
    const channel = await this.getChannel();
    try {
      await channel.purgeQueue(queueName);
    } catch (error) {
      throw new Error(`Failed to purge queue ${queueName}: ${error}`);
    }
  }

  /**
   * Delete a queue
   */
  async deleteQueue(queueName: string): Promise<void> {
    const channel = await this.getChannel();
    try {
      await channel.deleteQueue(queueName);
    } catch (error) {
      throw new Error(`Failed to delete queue ${queueName}: ${error}`);
    }
  }

  /**
   * Declare a queue
   */
  async declareQueue(
    queueName: string,
    options?: amqp.Options.AssertQueue,
  ): Promise<amqp.Replies.AssertQueue> {
    const channel = await this.getChannel();
    return channel.assertQueue(queueName, options);
  }

  /**
   * Declare an exchange
   */
  async declareExchange(
    exchangeName: string,
    type: string,
    options?: amqp.Options.AssertExchange,
  ): Promise<amqp.Replies.AssertExchange> {
    const channel = await this.getChannel();
    return channel.assertExchange(exchangeName, type, options);
  }

  /**
   * Bind a queue to an exchange
   */
  async bindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string,
  ): Promise<any> {
    const channel = await this.getChannel();
    return channel.bindQueue(queueName, exchangeName, routingKey);
  }

  /**
   * Publish a message to an exchange
   */
  async publishMessage(
    exchangeName: string,
    routingKey: string,
    message: Record<string, any>,
    options?: amqp.Options.Publish,
  ): Promise<boolean> {
    const channel = await this.getChannel();
    const buffer = Buffer.from(JSON.stringify(message));
    return channel.publish(exchangeName, routingKey, buffer, options);
  }

  /**
   * Dump RabbitMQ state to a file
   */
  async dump(filepath: string, options?: SnapshotOptions): Promise<void> {
    const managementUrl = `http://${this.credentials.host}:15672/api/definitions`;
    const auth = Buffer.from(
      `${this.credentials.username || 'guest'}:${this.credentials.password || 'guest'}`,
    ).toString('base64');

    try {
      const response = await fetch(managementUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch RabbitMQ definitions: ${response.statusText}`);
      }

      const snapshot: DumpSnapshot = {
        timestamp: Date.now(),
        provider: 'rabbitmq',
        version: '1.0',
        data: [
          {
            type: 'definitions',
            timestamp: Date.now(),
            data: (await response.json()) as Record<string, any>,
          },
        ],
      };

      const content = options?.pretty ? JSON.stringify(snapshot, null, 2) : JSON.stringify(snapshot);
      const dir = path.dirname(filepath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filepath, content);
    } catch (error) {
      throw new Error(`Failed to dump RabbitMQ state: ${error}`);
    }
  }

  /**
   * Restore RabbitMQ state from a file
   */
  async restore(filepath: string): Promise<void> {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Snapshot file not found: ${filepath}`);
    }

    const snapshot = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as DumpSnapshot;
    const definitions = snapshot.data[0]?.data;

    if (!definitions) {
      throw new Error('Invalid snapshot format');
    }

    const managementUrl = `http://${this.credentials.host}:15672/api/definitions`;
    const auth = Buffer.from(
      `${this.credentials.username || 'guest'}:${this.credentials.password || 'guest'}`,
    ).toString('base64');

    try {
      const response = await fetch(managementUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(definitions),
      });

      if (!response.ok) {
        throw new Error(`Failed to restore RabbitMQ definitions: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to restore RabbitMQ state: ${error}`);
    }
  }

  private buildConnectionUrl(): string {
    const protocol = 'amqp';
    const username = this.credentials.username || 'guest';
    const password = this.credentials.password || 'guest';
    const host = this.credentials.host || 'localhost';
    const port = this.credentials.port || 5672;
    const vhost = this.credentials.vhost || '/';

    return `${protocol}://${username}:${password}@${host}:${port}/${encodeURIComponent(vhost)}`;
  }
}
