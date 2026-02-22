/**
 * Example test file showing how to use the test-kit clients
 */

import { RabbitMQClient, RedisClient, ElasticSearchClient, MySQLClient } from '../src/index';
// import { RabbitMQClient, RedisClient, ElasticSearchClient, MySQLClient } from '../dist/index';

// Example: Using RabbitMQ Client
async function exampleRabbitMQ(): Promise<void> {
  const rabbitmqClient = new RabbitMQClient({
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672'),
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
  });

  await rabbitmqClient.connect();

  await rabbitmqClient.deleteAllQueues();

  // Get all queues
  const queues = await rabbitmqClient.getAllQueues();
  console.log('RabbitMQ Queues:', queues);

  // Declare a queue
  await rabbitmqClient.declareQueue('test-queue', { durable: true });

  // Publish a message
  await rabbitmqClient.publishMessage('', 'test-queue', { hello: 'world' });

  // Dump state
  await rabbitmqClient.dump('./tmp/rabbitmq.json', { pretty: true });

  await rabbitmqClient.disconnect();
}

// Example: Using Redis Client
async function exampleRedis():Promise<void> {
  const redisClient = new RedisClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  await redisClient.connect();
  await redisClient.deleteAllKeys();

  // Set a value
  await redisClient.set('mykey', 'myvalue', 3600);

  // Get a value
  const value = await redisClient.get('mykey');
  console.log('Redis Value:', value);

  // Get all keys
  const keys = await redisClient.getAllKeys();
  console.log('Redis Keys:', keys);

  // Dump state
  await redisClient.dump('./tmp/redis.json', { pretty: true });

  // Restore state
  await redisClient.restore('./tmp/redis.json');

  await redisClient.disconnect();
}

// Example: Using ElasticSearch Client
async function exampleElasticSearch(): Promise<void> {
  const esClient = new ElasticSearchClient({
    host: process.env.ELASTICSEARCH_HOST || 'localhost',
    port: parseInt(process.env.ELASTICSEARCH_PORT || '9200'),
  });

  await esClient.connect();

  await esClient.deleteAllIndices();

  // Create an index
  await esClient.createIndex('products');

  // Index a document
  await esClient.indexDocument('products', '1', {
    name: 'Product 1',
    price: 99.99,
  });

  // Get a document
  const doc = await esClient.getDocument('products', '1');
  console.log('ES Document:', doc);

  // Get all indices
  const indices = await esClient.getAllIndices();
  console.log('ES Indices:', indices);

  // Search documents
  const results = await esClient.search({
    index: 'products',
    query: { match_all: {} },
  });
  console.log('ES Search Results:', results);

  // Dump state
  await esClient.dump('./tmp/elasticsearch.json', { pretty: true });

  // Restore state
  await esClient.restore('./tmp/elasticsearch.json');

  await esClient.disconnect();
}

// Example: Using MySQL Client
async function exampleMySQL(): Promise<void> {
  const mysqlClient = new MySQLClient({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    username: process.env.MYSQL_USERNAME || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'test',
  });

  await mysqlClient.connect();
  await mysqlClient.deleteAllTables();

  // Create a table
  await mysqlClient.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE
    )
  `);

  // Insert data
  const userId = await mysqlClient.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
  });
  console.log('MySQL Insert ID:', userId);

  // Query data
  const users = await mysqlClient.queryAll('SELECT * FROM users');
  console.log('MySQL Users:', users);

  // Update data
  const updated = await mysqlClient.update(
    'users',
    { name: 'Jane Doe' },
    { email: 'john@example.com' },
  );
  console.log('MySQL Updated Rows:', updated);

  // Get table info
  const tableInfo = await mysqlClient.getTableInfo('users');
  console.log('MySQL Table Info:', tableInfo);

  // Dump state
  await mysqlClient.dump('./tmp/mysql.json', { pretty: true });

  await mysqlClient.disconnect();
}

// Run all examples
async function runExamples(): Promise<void> {
  try {
    console.log('=== RabbitMQ Example ===');
    await exampleRabbitMQ();

    console.log('\n=== Redis Example ===');
    await exampleRedis();

    console.log('\n=== ElasticSearch Example ===');
    await exampleElasticSearch();

    console.log('\n=== MySQL Example ===');
    await exampleMySQL();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runExamples();
}

export { exampleRabbitMQ, exampleRedis, exampleElasticSearch, exampleMySQL };
