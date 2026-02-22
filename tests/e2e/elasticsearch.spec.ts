/**
 * Example test for ElasticSearch Client
 */

import { ElasticSearchClient } from '../../src/clients/elasticsearch';

describe('ElasticSearchClient', () => {
  let client: ElasticSearchClient;

  const credentials = {
    host: process.env.ELASTICSEARCH_HOST || 'localhost',
    port: parseInt(process.env.ELASTICSEARCH_PORT || '9200'),
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  };

  beforeAll(async () => {
    client = new ElasticSearchClient(credentials);
    await client.connect();

    // Clean up test indices for clean test start
    const indicesToDelete = [
      'test-index',
      'test-index-1',
      'test-index-2',
    ];
    for (const index of indicesToDelete) {
      await client.deleteIndex(index).catch(() => {});
    }
  });

  afterAll(async () => {
    await client.disconnect();
  });

  beforeEach(async () => {
    // Clean up test indices before each test
    try {
      await client.deleteIndex('test-index');
    } catch {
      // Index might not exist
    }
  });

  describe('Index Management', () => {
    it('should create an index', async () => {
      await expect(client.createIndex('test-index')).resolves.not.toThrow();
    });

    it('should get all indices', async () => {
      await client.createIndex('test-index-1');
      await client.createIndex('test-index-2');

      const indices = await client.getAllIndices();
      expect(Array.isArray(indices)).toBe(true);
    });

    it('should delete an index', async () => {
      await client.createIndex('delete-test');
      await expect(client.deleteIndex('delete-test')).resolves.not.toThrow();
    });
  });

  describe('Document Operations', () => {
    beforeEach(async () => {
      await client.createIndex('test-index');
    });

    it('should index a document', async () => {
      await expect(
        client.indexDocument('test-index', 'doc-1', { name: 'John', age: 30 }),
      ).resolves.not.toThrow();
    });

    it('should get a document', async () => {
      await client.indexDocument('test-index', 'doc-1', { name: 'John', age: 30 });
      await client.refreshIndex('test-index');

      const doc = await client.getDocument('test-index', 'doc-1');
      expect(doc?.name).toBe('John');
      expect(doc?.age).toBe(30);
    });

    it('should delete a document', async () => {
      await client.indexDocument('test-index', 'doc-1', { name: 'John' });
      await expect(client.deleteDocument('test-index', 'doc-1')).resolves.not.toThrow();
    });

    it('should return null for non-existent document', async () => {
      const doc = await client.getDocument('test-index', 'non-existent');
      expect(doc).toBeNull();
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      await client.createIndex('test-index');
      await client.indexDocument('test-index', '1', { title: 'Document 1', status: 'active' });
      await client.indexDocument('test-index', '2', { title: 'Document 2', status: 'active' });
      await client.indexDocument('test-index', '3', { title: 'Document 3', status: 'inactive' });
      await client.refreshIndex('test-index');
    });

    it('should search documents', async () => {
      const results = await client.search({
        index: 'test-index',
        query: { match_all: {} },
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should get all documents', async () => {
      const docs = await client.getAllDocuments('test-index');
      expect(docs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      await client.createIndex('test-index');
    });

    it('should delete all documents', async () => {
      await client.indexDocument('test-index', '1', { name: 'Doc 1' });
      await client.indexDocument('test-index', '2', { name: 'Doc 2' });
      await client.refreshIndex('test-index');

      const deleted = await client.deleteAllDocuments('test-index');
      expect(deleted).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Dump and Restore', () => {
    beforeEach(async () => {
      await client.createIndex('test-index');
      await client.indexDocument('test-index', 'doc-1', { name: 'John', value: 100 });
      await client.refreshIndex('test-index');
    });

    it('should dump index state to file', async () => {
      await expect(
        client.dump('./test-snapshots/es-dump.json', { pretty: true }),
      ).resolves.not.toThrow();
    });

    it('should restore index state from file', async () => {
      await client.dump('./test-snapshots/es-restore.json');

      await client.deleteIndex('test-index');
      let doc = await client.getDocument('test-index', 'doc-1');
      expect(doc).toBeNull();

      await client.restore('./test-snapshots/es-restore.json');
      await client.refreshIndex('test-index');

      doc = await client.getDocument('test-index', 'doc-1');
      expect(doc?.name).toBe('John');
      expect(doc?.value).toBe(100);
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const testClient = new ElasticSearchClient(credentials);
      await expect(testClient.connect()).resolves.not.toThrow();
      await testClient.disconnect();
    });

    it('should get official client', async () => {
      const officialClient = await client.getOfficialClient();
      expect(officialClient).toBeDefined();
    });
  });
});
