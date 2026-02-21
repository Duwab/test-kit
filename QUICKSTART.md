# Quick Start Guide

Get started with @duwab/test-kit in 5 minutes!

## Installation

```bash
npm install -D @duwab/test-kit
```

## Start Services

```bash
# Using docker-compose
docker-compose up -d

# Or using make
make start-services
```

This starts:
- 🐰 RabbitMQ: http://localhost:15672 (guest/guest)
- 🔴 Redis: localhost:6379
- 🔍 Elasticsearch: http://localhost:9200

## Basic Usage

### RabbitMQ Example

```typescript
import { RabbitMQClient } from '@duwab/test-kit';

async function example() {
  const client = new RabbitMQClient({
    host: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
  });

  // Connect
  await client.connect();

  // Create a queue
  await client.declareQueue('my-queue');

  // Send a message
  await client.publishMessage('', 'my-queue', {
    message: 'Hello, World!',
  });

  // Check queue stats
  const stats = await client.getAllQueues();
  console.log(stats);

  // Save state
  await client.dump('./my-snapshot.json', { pretty: true });

  // Cleanup
  await client.disconnect();
}

example().catch(console.error);
```

### Redis Example

```typescript
import { RedisClient } from '@duwab/test-kit';

async function example() {
  const client = new RedisClient({
    host: 'localhost',
    port: 6379,
  });

  await client.connect();

  // Set and get
  await client.set('user:1', 'John Doe');
  const value = await client.get('user:1');
  console.log(value); // "John Doe"

  // Work with patterns
  await client.set('user:2', 'Jane Doe');
  const users = await client.getAllByPattern('user:*');
  console.log(users);

  // Clean database
  await client.flushDB();

  await client.disconnect();
}

example().catch(console.error);
```

### Elasticsearch Example

```typescript
import { ElasticSearchClient } from '@duwab/test-kit';

async function example() {
  const client = new ElasticSearchClient({
    host: 'localhost',
    port: 9200,
  });

  await client.connect();

  // Create index
  await client.createIndex('products');

  // Add document
  await client.indexDocument('products', '1', {
    name: 'Laptop',
    price: 999.99,
  });

  // Refresh to make searchable
  await client.refreshIndex('products');

  // Search
  const results = await client.search({
    index: 'products',
    query: { match_all: {} },
  });
  console.log(results);

  await client.disconnect();
}

example().catch(console.error);
```

## Testing Pattern

```typescript
import { RabbitMQClient } from '@duwab/test-kit';

describe('My E2E Test', () => {
  let client: RabbitMQClient;

  beforeAll(async () => {
    client = new RabbitMQClient({ host: 'localhost' });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  beforeEach(async () => {
    // Save clean state before each test
    await client.dump('./snapshots/clean.json');
  });

  afterEach(async () => {
    // Restore clean state after each test
    await client.restore('./snapshots/clean.json');
  });

  test('should handle queues', async () => {
    await client.declareQueue('test-queue');
    // Your test here
  });
});
```

## Common Operations

### Dump and Restore State

```typescript
const client = new RabbitMQClient(config);
await client.connect();

// Save current state
await client.dump('./snapshot.json', { pretty: true });

// Do something...

// Restore from snapshot
await client.restore('./snapshot.json');

await client.disconnect();
```

### Get Official Client

Access the underlying client library:

```typescript
const client = new RabbitMQClient(config);
await client.connect();

// Get amqplib
const amqplibConn = await client.getOfficialClient();

// Use native features
const channel = await amqplibConn.createChannel();
```

### Error Handling

```typescript
import { RabbitMQClient } from '@duwab/test-kit';

try {
  const client = new RabbitMQClient(config);
  await client.connect();
  // Use client...
} catch (error) {
  console.error('Connection failed:', error.message);
} finally {
  // Always cleanup
  await client.disconnect();
}
```

## Next Steps

- Read the [full documentation](./README.md)
- Check [development guide](./DEVELOPMENT.md)
- View [usage examples](./examples/usage.ts)
- Run tests: `npm run test`
- Run e2e tests: `npm run test:e2e`

## Troubleshooting

### Services won't connect

```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs
```

### Timeout errors

- Increase timeout in client options: `{ timeout: 10000 }`
- Ensure docker services are healthy
- Check available system resources

### Connection refused

```bash
# Restart services
docker-compose down
docker-compose up -d
```

## Tips & Tricks

1. **Reuse clients** - Create once, use multiple times
2. **Use try/finally** - Always disconnect in finally block
3. **Snapshot early** - Save clean state before tests
4. **Check health** - Use`docker-compose ps` to verify services
5. **Resource cleanup** - Flush databases between test suites

## Need Help?

- Check [README](./README.md) for detailed documentation
- Review [examples](./examples/usage.ts) for more patterns
- See [tests](./tests/e2e/) for real usage
- Create an [issue](https://github.com) for problems

Happy testing! 🚀
