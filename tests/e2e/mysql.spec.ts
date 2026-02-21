/**
 * Example test for MySQL Client
 */

import { MySQLClient } from '../../src/clients/mysql';

describe('MySQLClient', () => {
  let client: MySQLClient;

  const credentials = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    username: process.env.MYSQL_USERNAME || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'test',
  };

  beforeAll(async () => {
    client = new MySQLClient(credentials);
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  beforeEach(async () => {
    // Clean up test tables before each test
    try {
      await client.truncateAll();
    } catch {
      // Tables might not exist
    }
  });

  describe('Table Management', () => {
    it('should create a table via query', async () => {
      const sql = `
        CREATE TABLE IF NOT EXISTS test_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE
        )
      `;
      await expect(client.query(sql)).resolves.not.toThrow();
    });

    it('should get all tables', async () => {
      // Create a test table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255)
        )
      `);

      const tables = await client.getAllTables();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.some((t) => t.name === 'users')).toBe(true);
    });

    it('should truncate a table', async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INT AUTO_INCREMENT PRIMARY KEY,
          value VARCHAR(255)
        )
      `);

      await client.insert('test_table', { value: 'test' });
      await client.truncateTable('test_table');

      const result = await client.queryAll('SELECT * FROM test_table');
      expect(result).toHaveLength(0);
    });

    it('should drop a table', async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS table_to_drop (
          id INT AUTO_INCREMENT PRIMARY KEY
        )
      `);

      await expect(client.dropTable('table_to_drop')).resolves.not.toThrow();
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(10, 2),
          stock INT DEFAULT 0
        )
      `);
    });

    it('should insert a row', async () => {
      const id = await client.insert('products', {
        name: 'Laptop',
        price: 999.99,
        stock: 10,
      });

      expect(id).toBeGreaterThan(0);
    });

    it('should insert multiple rows', async () => {
      await client.insert('products', { name: 'Product 1', price: 10.0 });
      await client.insert('products', { name: 'Product 2', price: 20.0 });
      await client.insert('products', { name: 'Product 3', price: 30.0 });

      const results = await client.queryAll('SELECT * FROM products');
      expect(results).toHaveLength(3);
    });

    it('should update rows', async () => {
      await client.insert('products', { name: 'Product', price: 10.0 });

      const updated = await client.update(
        'products',
        { price: 15.0 },
        { name: 'Product' }
      );

      expect(updated).toBeGreaterThan(0);

      const result = await client.queryOne('SELECT * FROM products WHERE name = ?', [
        'Product',
      ]);
      expect((result as any)?.price).toBe(15);
    });

    it('should delete rows', async () => {
      await client.insert('products', { name: 'ToDelete', price: 10.0 });
      await client.insert('products', { name: 'ToKeep', price: 20.0 });

      const deleted = await client.delete('products', { name: 'ToDelete' });
      expect(deleted).toBeGreaterThan(0);

      const results = await client.queryAll('SELECT * FROM products');
      expect(results).toHaveLength(1);
      expect((results[0] as any)?.name).toBe('ToKeep');
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customer_name VARCHAR(255),
          amount DECIMAL(10, 2),
          status VARCHAR(50)
        )
      `);
    });

    it('should execute a query and get all results', async () => {
      await client.insert('orders', { customer_name: 'Alice', amount: 100.0 });
      await client.insert('orders', { customer_name: 'Bob', amount: 200.0 });

      const results = await client.queryAll('SELECT * FROM orders');
      expect(results).toHaveLength(2);
    });

    it('should query a single row', async () => {
      await client.insert('orders', { customer_name: 'Charlie', amount: 150.0 });

      const result = await client.queryOne('SELECT * FROM orders WHERE customer_name = ?', [
        'Charlie',
      ]);

      expect(result).not.toBeNull();
      expect((result as any)?.customer_name).toBe('Charlie');
    });

    it('should return null for non-existent row', async () => {
      const result = await client.queryOne('SELECT * FROM orders WHERE customer_name = ?', [
        'NonExistent',
      ]);

      expect(result).toBeNull();
    });
  });

  describe('Data Export/Import', () => {
    beforeEach(async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_table (
          id INT AUTO_INCREMENT PRIMARY KEY,
          value VARCHAR(255)
        )
      `);
    });

    it('should dump table data to file', async () => {
      await client.insert('data_table', { value: 'test-value' });

      await expect(
        client.dump('./test-snapshots/mysql-dump.json', { pretty: true })
      ).resolves.not.toThrow();
    });

    it('should restore table data from file', async () => {
      await client.insert('data_table', { value: 'original-value' });
      await client.dump('./test-snapshots/mysql-restore.json');

      // Clear table
      await client.truncateTable('data_table');
      let results = await client.queryAll('SELECT * FROM data_table');
      expect(results).toHaveLength(0);

      // Restore
      await client.restore('./test-snapshots/mysql-restore.json');
      results = await client.queryAll('SELECT * FROM data_table');
      expect(results).toHaveLength(1);
      expect((results[0] as any)?.value).toBe('original-value');
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const testClient = new MySQLClient(credentials);
      await expect(testClient.connect()).resolves.not.toThrow();
      expect(testClient['isConnected']).toBe(true);
      await testClient.disconnect();
    });

    it('should get official client', async () => {
      const officialClient = await client.getOfficialClient();
      expect(officialClient).toBeDefined();
    });
  });

  describe('Table Info', () => {
    beforeEach(async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS info_test (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255)
        )
      `);
    });

    it('should get table information', async () => {
      const tableInfo = await client.getTableInfo('info_test');

      expect(tableInfo).not.toBeNull();
      expect(tableInfo?.name).toBe('info_test');
      expect(tableInfo?.columns.length).toBeGreaterThan(0);
      expect(tableInfo?.columns.some((c) => c.name === 'id')).toBe(true);
    });
  });
});
