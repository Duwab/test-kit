/**
 * Example test file showing how to use the test-kit clients
 */

import { RabbitMQClient, RedisClient, ElasticSearchClient } from '../src/index';

// Example: Using RabbitMQ Client
async function exampleRabbitMQ() {
  const rabbitmqClient = new RabbitMQClient({
    host: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
  });

  await rabbitmqClient.connect();

  // Get all queues
  const queues = await rabbitmqClient.getAllQueues();
  console.log('RabbitMQ Queues:', queues);

  // Declare a queue
  await rabbitmqClient.declareQueue('test-queue', { durable: true });

  // Publish a message
  await rabbitmqClient.publishMessage('', 'test-queue', { hello: 'world' });

  // Dump state
  await rabbitmqClient.dump('./snapshots/rabbitmq.json', { pretty: true });

  await rabbitmqClient.disconnect();
}

// Example: Using Redis Client
async function exampleRedis() {
  const redisClient = new RedisClient({
    host: 'localhost',
    port: 6379,
  });

  await redisClient.connect();

  // Set a value
  await redisClient.set('mykey', 'myvalue', 3600);

  // Get a value
  const value = await redisClient.get('mykey');
  console.log('Redis Value:', value);

  // Get all keys
  const keys = await redisClient.getAllKeys();
  console.log('Redis Keys:', keys);

  // Dump state
  await redisClient.dump('./snapshots/redis.json', { pretty: true });

  // Restore state
  await redisClient.restore('./snapshots/redis.json');

  await redisClient.disconnect();
}

// Example: Using ElasticSearch Client
async function exampleElasticSearch() {
  const esClient = new ElasticSearchClient({
    host: 'localhost',
    port: 9200,
  });

  await esClient.connect();

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
  await esClient.dump('./snapshots/elasticsearch.json', { pretty: true });

  // Restore state
  await esClient.restore('./snapshots/elasticsearch.json');

  await esClient.disconnect();
}

// Run all examples
async function runExamples() {
  try {
    console.log('=== RabbitMQ Example ===');
    await exampleRabbitMQ();

    console.log('\n=== Redis Example ===');
    await exampleRedis();

    console.log('\n=== ElasticSearch Example ===');
    await exampleElasticSearch();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runExamples();
}

export { exampleRabbitMQ, exampleRedis, exampleElasticSearch };
