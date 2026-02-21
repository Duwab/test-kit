/**
 * Example test for RabbitMQ Client
 */

import { RabbitMQClient } from '../../src/clients/rabbitmq';

describe('RabbitMQClient', () => {
  let client: RabbitMQClient;

  const credentials = {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672'),
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
  };

  beforeAll(async () => {
    client = new RabbitMQClient(credentials);
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Queue Management', () => {
    it('should declare a queue', async () => {
      const result = await client.declareQueue('test-queue', { durable: false });
      expect(result.queue).toBe('test-queue');
    });

    it('should get all queues', async () => {
      await client.declareQueue('queue-1');
      await client.declareQueue('queue-2');

      const queues = await client.getAllQueues();
      expect(queues).toBeDefined();
      expect(Array.isArray(queues)).toBe(true);
    });

    it('should purge a queue', async () => {
      await client.declareQueue('purge-test');
      await expect(client.purgeQueue('purge-test')).resolves.not.toThrow();
    });

    it('should delete a queue', async () => {
      await client.declareQueue('delete-test');
      await expect(client.deleteQueue('delete-test')).resolves.not.toThrow();
    });
  });

  describe('Exchange Management', () => {
    it('should declare an exchange', async () => {
      const result = await client.declareExchange('test-exchange', 'direct', { durable: false });
      expect(result.exchange).toBe('test-exchange');
    });
  });

  describe('Message Publishing', () => {
    it('should publish a message', async () => {
      await client.declareQueue('publish-test');
      const result = await client.publishMessage('', 'publish-test', { data: 'test' });
      expect(result).toBe(true);
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const testClient = new RabbitMQClient(credentials);
      await expect(testClient.connect()).resolves.not.toThrow();
      expect(testClient['isConnected']).toBe(true);
      await testClient.disconnect();
    });

    it('should get official client', async () => {
      const officialClient = await client.getOfficialClient();
      expect(officialClient).toBeDefined();
    });
  });
});
