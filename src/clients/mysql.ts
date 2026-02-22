/**
 * MySQL Test Client
 */

import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { BaseTestClient, ClientCredentials, BaseClientOptions, DumpSnapshot, SnapshotOptions } from '../base';

export interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
}

export interface QueryResult<T = any> {
  rows: T[];
  fields: any[];
  affectedRows?: number;
}

export class MySQLClient extends BaseTestClient {
  private connection: mysql.Connection | null = null;

  async connect(): Promise<void> {
    if (this.isConnected && this.connection) {
      return;
    }

    await this.retry(async () => {
      this.connection = await mysql.createConnection({
        host: this.credentials.host || 'localhost',
        port: this.credentials.port || 3306,
        user: this.credentials.username || 'root',
        password: this.credentials.password || '',
        database: this.credentials.database || 'test',
      });

      // Test connection
      await this.connection.ping();
      this.isConnected = true;
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
    this.isConnected = false;
  }

  /**
   * Get the official mysql2 connection
   */
  async getOfficialClient(): Promise<mysql.Connection> {
    if (!this.connection) {
      await this.connect();
    }
    return this.connection!;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = any>(sql: string, values?: any[]): Promise<QueryResult<T>> {
    const connection = await this.getOfficialClient();
    try {
      const [rows, fields] = (await connection.query(sql, values)) as any;
      return {
        rows: (rows || []) as T[],
        fields: fields || [],
      };
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  /**
   * Execute a query that returns a single row
   */
  async queryOne<T = any>(sql: string, values?: any[]): Promise<T | null> {
    const result = await this.query<T>(sql, values);
    return result.rows[0] || null;
  }

  /**
   * Execute a query that returns all rows
   */
  async queryAll<T = any>(sql: string, values?: any[]): Promise<T[]> {
    const result = await this.query<T>(sql, values);
    return result.rows;
  }

  /**
   * Get all tables in the database
   */
  async getAllTables(): Promise<TableInfo[]> {
    const connection = await this.getOfficialClient();
    const database = this.credentials.database || 'test';

    try {
      // Get list of tables
      const [tables] = (await connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
        [database]
      )) as any;

      const tableInfos: TableInfo[] = [];

      for (const table of (tables || []) as any[]) {
        const tableName = table.TABLE_NAME;

        // Get row count
        const [countResult] = (await connection.query(
          `SELECT COUNT(*) as count FROM \`${tableName}\``
        )) as any;
        const rowCount = (countResult[0] as any)?.count || 0;

        // Get columns
        const [columns] = (await connection.query(
          `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [database, tableName]
        )) as any;

        const columnInfos: ColumnInfo[] = (columns || []).map((col: any) => ({
          name: col.COLUMN_NAME,
          type: col.COLUMN_TYPE,
          nullable: col.IS_NULLABLE === 'YES',
          key: col.COLUMN_KEY,
        }));

        tableInfos.push({
          name: tableName,
          rowCount,
          columns: columnInfos,
        });
      }

      return tableInfos;
    } catch (error) {
      throw new Error(`Failed to get tables: ${error}`);
    }
  }

  async deleteAllTables(): Promise<void> {
    const tables = await this.getAllTables();

    for (const table of tables) {
      await this.dropTable(table.name);
    }
  }

  /**
   * Get information about a specific table
   */
  async getTableInfo(tableName: string): Promise<TableInfo | null> {
    const tables = await this.getAllTables();
    return tables.find((t) => t.name === tableName) || null;
  }

  /**
   * Truncate a table (delete all rows)
   */
  async truncateTable(tableName: string): Promise<void> {
    const connection = await this.getOfficialClient();
    try {
      await connection.query(`TRUNCATE TABLE \`${tableName}\``);
    } catch (error) {
      throw new Error(`Failed to truncate table ${tableName}: ${error}`);
    }
  }

  /**
   * Drop a table
   */
  async dropTable(tableName: string): Promise<void> {
    const connection = await this.getOfficialClient();
    try {
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    } catch (error) {
      throw new Error(`Failed to drop table ${tableName}: ${error}`);
    }
  }

  /**
   * Insert a row
   */
  async insert(table: string, data: Record<string, any>): Promise<number> {
    const connection = await this.getOfficialClient();
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO \`${table}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders})`;

    try {
      const [result] = await connection.query(sql, values) as any;
      return result.insertId;
    } catch (error) {
      throw new Error(`Failed to insert into ${table}: ${error}`);
    }
  }

  /**
   * Update rows
   */
  async update(table: string, data: Record<string, any>, where?: Record<string, any>): Promise<number> {
    const connection = await this.getOfficialClient();
    const setClause = Object.keys(data)
      .map((key) => `\`${key}\` = ?`)
      .join(', ');
    const setValues = Object.values(data);

    let sql = `UPDATE \`${table}\` SET ${setClause}`;
    let queryValues: any[] = setValues;

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `\`${key}\` = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      queryValues = [...setValues, ...Object.values(where)];
    }

    try {
      const [result] = await connection.query(sql, queryValues) as any;
      return result.affectedRows;
    } catch (error) {
      throw new Error(`Failed to update ${table}: ${error}`);
    }
  }

  /**
   * Delete rows
   */
  async delete(table: string, where?: Record<string, any>): Promise<number> {
    const connection = await this.getOfficialClient();
    let sql = `DELETE FROM \`${table}\``;
    let queryValues: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `\`${key}\` = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      queryValues = Object.values(where);
    }

    try {
      const [result] = await connection.query(sql, queryValues) as any;
      return result.affectedRows;
    } catch (error) {
      throw new Error(`Failed to delete from ${table}: ${error}`);
    }
  }

  /**
   * Truncate all tables
   */
  async truncateAll(): Promise<void> {
    const connection = await this.getOfficialClient();
    try {
      // Disable foreign key checks temporarily
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');

      const tables = await this.getAllTables();
      for (const table of tables) {
        await connection.query(`TRUNCATE TABLE \`${table.name}\``);
      }

      // Re-enable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
      throw new Error(`Failed to truncate all tables: ${error}`);
    }
  }

  /**
   * Get all data from a table
   */
  async getAllData(tableName: string): Promise<Record<string, any>[]> {
    return this.queryAll(`SELECT * FROM \`${tableName}\``);
  }

  /**
   * Dump MySQL state to a file
   */
  async dump(filepath: string, options?: SnapshotOptions): Promise<void> {
    const tables = await this.getAllTables();
    const data: Record<string, Record<string, any>[]> = {};

    for (const table of tables) {
      data[table.name] = await this.getAllData(table.name);
    }

    const snapshot: DumpSnapshot = {
      timestamp: Date.now(),
      provider: 'mysql',
      version: '1.0',
      data: [
        {
          type: 'tables',
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
   * Restore MySQL state from a file
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

    const connection = await this.getOfficialClient();

    try {
      // Disable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');

      // Restore data
      for (const [tableName, rows] of Object.entries(data)) {
        // Truncate table first
        await connection.query(`TRUNCATE TABLE \`${tableName}\``);

        // Insert data
        for (const row of rows as Record<string, any>[]) {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map(() => '?').join(', ');

          const sql = `INSERT INTO \`${tableName}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders})`;
          await connection.query(sql, values);
        }
      }

      // Re-enable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
      throw new Error(`Failed to restore MySQL state: ${error}`);
    }
  }
}
