/**
 * ElasticSearch Test Client
 */

import { Client } from '@elastic/elasticsearch';
import * as fs from 'fs';
import * as path from 'path';
import { BaseTestClient, ClientCredentials, BaseClientOptions, DumpSnapshot, SnapshotOptions } from '../base';

export interface IndexStats {
  name: string;
  docCount: number;
  sizeInBytes: number;
  status: string;
}

export interface DocumentsQuery {
  index: string;
  size?: number;
  query?: Record<string, any>;
}

export class ElasticSearchClient extends BaseTestClient {
  private client: Client | null = null;

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    await this.retry(async () => {
      this.client = new Client({
        node: `http://${this.credentials.host || 'localhost'}:${this.credentials.port || 9200}`,
        auth:
          this.credentials.username && this.credentials.password
            ? {
                username: this.credentials.username,
                password: this.credentials.password,
              }
            : undefined,
        requestTimeout: this.options.timeout || 5000,
      });

      // Test connection
      await this.client.info();
      this.isConnected = true;
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.isConnected = false;
  }

  /**
   * Get the official Elasticsearch client
   */
  async getOfficialClient(): Promise<Client> {
    if (!this.client) {
      await this.connect();
    }
    return this.client!;
  }

  /**
   * Get all indices with their statistics
   */
  async getAllIndices(): Promise<IndexStats[]> {
    const client = await this.getOfficialClient();
    const stats = await client.indices.stats();

    const indices: IndexStats[] = [];

    if (stats.indices) {
      for (const [name, indexStats] of Object.entries(stats.indices)) {
        indices.push({
          name,
          docCount: indexStats.primaries?.docs?.count || 0,
          sizeInBytes: indexStats.primaries?.store?.size_in_bytes || 0,
          status: 'active', // Could fetch more details if needed
        });
      }
    }

    return indices;
  }

  /**
   * Get statistics for a specific index
   */
  async getIndexStats(indexName: string): Promise<IndexStats | null> {
    const indices = await this.getAllIndices();
    return indices.find((i) => i.name === indexName) || null;
  }

  /**
   * Create an index
   */
  async createIndex(indexName: string, settings?: Record<string, any>): Promise<void> {
    const client = await this.getOfficialClient();
    try {
      await client.indices.create({
        index: indexName,
        ...(settings && { settings }),
      });
    } catch (error) {
      throw new Error(`Failed to create index ${indexName}: ${error}`);
    }
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    const client = await this.getOfficialClient();
    try {
      await client.indices.delete({ index: indexName });
    } catch (error) {
      throw new Error(`Failed to delete index ${indexName}: ${error}`);
    }
  }

  /**
   * Index (create/update) a document
   */
  async indexDocument(
    indexName: string,
    documentId: string,
    document: Record<string, any>
  ): Promise<void> {
    const client = await this.getOfficialClient();
    try {
      await client.index({
        index: indexName,
        id: documentId,
        document,
      });
    } catch (error) {
      throw new Error(`Failed to index document: ${error}`);
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument(indexName: string, documentId: string): Promise<Record<string, any> | null> {
    const client = await this.getOfficialClient();
    try {
      const response = await client.get({
        index: indexName,
        id: documentId,
      });
      return (response._source as Record<string, any>) || null;
    } catch (error) {
      if ((error as any)?.statusCode === 404) {
        return null;
      }
      throw new Error(`Failed to get document: ${error}`);
    }
  }

  /**
   * Search documents
   */
  async search(query: DocumentsQuery): Promise<Record<string, any>[]> {
    const client = await this.getOfficialClient();
    try {
      const response = await client.search({
        index: query.index,
        size: query.size || 100,
        ...(query.query && { query: query.query }),
      });

      return response.hits.hits.map((hit) => ({
        id: hit._id,
        ...(hit._source as Record<string, any>),
      })) as Record<string, any>[];
    } catch (error) {
      throw new Error(`Failed to search documents: ${error}`);
    }
  }

  /**
   * Get all documents in an index
   */
  async getAllDocuments(indexName: string, size: number = 1000): Promise<Record<string, any>[]> {
    return this.search({
      index: indexName,
      size,
      query: { match_all: {} },
    });
  }

  /**
   * Delete a document by ID
   */
  async deleteDocument(indexName: string, documentId: string): Promise<void> {
    const client = await this.getOfficialClient();
    try {
      await client.delete({
        index: indexName,
        id: documentId,
      });
    } catch (error) {
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  /**
   * Delete all documents in an index
   */
  async deleteAllDocuments(indexName: string): Promise<number> {
    const client = await this.getOfficialClient();
    try {
      const response = await client.deleteByQuery({
        index: indexName,
        query: { match_all: {} },
      });
      return response.deleted || 0;
    } catch (error) {
      throw new Error(`Failed to delete documents: ${error}`);
    }
  }

  /**
   * Refresh an index
   */
  async refreshIndex(indexName: string): Promise<void> {
    const client = await this.getOfficialClient();
    try {
      await client.indices.refresh({ index: indexName });
    } catch (error) {
      throw new Error(`Failed to refresh index: ${error}`);
    }
  }

  /**
   * Dump ElasticSearch state to a file
   */
  async dump(filepath: string, options?: SnapshotOptions): Promise<void> {
    const client = await this.getOfficialClient();
    const indices = await this.getAllIndices();
    const data: Record<string, Record<string, any>[]> = {};

    for (const index of indices) {
      data[index.name] = await this.getAllDocuments(index.name);
    }

    const snapshot: DumpSnapshot = {
      timestamp: Date.now(),
      provider: 'elasticsearch',
      version: '1.0',
      data: [
        {
          type: 'indices',
          timestamp: Date.now(),
          data,
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
   * Restore ElasticSearch state from a file
   */
  async restore(filepath: string): Promise<void> {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Snapshot file not found: ${filepath}`);
    }

    const snapshot = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as DumpSnapshot;
    const data = snapshot.data[0]?.data;

    if (!data) {
      throw new Error('Invalid snapshot format');
    }

    const client = await this.getOfficialClient();

    // Restore indices
    for (const [indexName, documents] of Object.entries(data)) {
      try {
        // Delete index if exists
        try {
          await client.indices.delete({ index: indexName });
        } catch {
          // Index might not exist, that's ok
        }

        // Create index
        await client.indices.create({ index: indexName });

        // Index documents
        for (const doc of documents as Record<string, any>[]) {
          const docId = doc.id || crypto.randomUUID?.() || Math.random().toString();
          const docData = { ...doc };
          delete docData.id;

          await client.index({
            index: indexName,
            id: docId,
            document: docData,
          });
        }

        // Refresh index
        await client.indices.refresh({ index: indexName });
      } catch (error) {
        throw new Error(`Failed to restore index ${indexName}: ${error}`);
      }
    }
  }
}
