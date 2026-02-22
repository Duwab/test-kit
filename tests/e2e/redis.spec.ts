/**
 * Example test for Redis Client
 */

import { RedisClient } from '../../src/clients/redis';

describe('RedisClient', () => {
  let client: RedisClient;

  const credentials = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  };

  beforeAll(async () => {
    client = new RedisClient(credentials);
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  beforeEach(async () => {
    await client.flushDB();
  });

  describe('Key-Value Operations', () => {
    it('should set and get a value', async () => {
      await client.set('mykey', 'myvalue');
      const value = await client.get('mykey');
      expect(value).toBe('myvalue');
    });

    it('should set value with TTL', async () => {
      await client.set('ttlkey', 'value', 10);
      const value = await client.get('ttlkey');
      expect(value).toBe('value');
    });

    it('should delete a key', async () => {
      await client.set('deletekey', 'value');
      const deleted = await client.delete('deletekey');
      expect(deleted).toBe(1);

      const value = await client.get('deletekey');
      expect(value).toBeNull();
    });
  });

  describe('Pattern Operations', () => {
    it('should get all keys matching pattern', async () => {
      await client.set('user:1', 'john');
      await client.set('user:2', 'jane');
      await client.set('product:1', 'laptop');

      const keys = await client.getAllKeys('user:*');
      expect(keys.length).toBe(2);
      expect(keys.map((k) => k.key)).toEqual(expect.arrayContaining(['user:1', 'user:2']));
    });

    it('should delete keys by pattern', async () => {
      await client.set('temp:1', 'value1');
      await client.set('temp:2', 'value2');
      await client.set('perm:1', 'value3');

      const deleted = await client.deleteByPattern('temp:*');
      expect(deleted).toBe(2);

      const temp1 = await client.get('temp:1');
      const perm1 = await client.get('perm:1');
      expect(temp1).toBeNull();
      expect(perm1).toBe('value3');
    });

    it('should get all data', async () => {
      await client.set('key1', 'value1');
      await client.set('key2', 'value2');

      const data = await client.getAllData();
      expect(Object.keys(data)).toContain('key1');
      expect(Object.keys(data)).toContain('key2');
    });
  });

  describe('Database Operations', () => {
    it('should flush database', async () => {
      await client.set('key1', 'value1');
      await client.flushDB();

      const keys = await client.getAllKeys('*');
      expect(keys.length).toBe(0);
    });

    it('should get database stats', async () => {
      await client.set('key1', 'value1');
      const stats = await client.getDBStats();
      expect(stats.db).toBeDefined();
      expect(stats.keys).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Dump and Restore', () => {
    it('should dump state to file', async () => {
      await client.set('key1', 'value1');
      await expect(
        client.dump('./test-snapshots/redis-dump.json', { pretty: true }),
      ).resolves.not.toThrow();
    });

    it('should restore state from file', async () => {
      await client.set('restore-key', 'restore-value');
      await client.dump('./test-snapshots/redis-restore.json');

      await client.flushDB();
      let value = await client.get('restore-key');
      expect(value).toBeNull();

      await client.restore('./test-snapshots/redis-restore.json');
      value = await client.get('restore-key');
      expect(value).toBe('restore-value');
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const testClient = new RedisClient(credentials);
      await expect(testClient.connect()).resolves.not.toThrow();
      await testClient.disconnect();
    });

    it('should get official client', async () => {
      const officialClient = await client.getOfficialClient();
      expect(officialClient).toBeDefined();
    });
  });
});
