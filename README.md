# Test Kit

A npm package written in Typescript to help running e2e tests for NodeJS and Typescript micro-services for distributed architectures.

## Main Features

* **Client libraries** for RabbitMQ, Redis, ElasticSearch
  * Simplified client creation with credentials
  * Helper methods to create/update/read/delete resources
  * Global listing functions
  * Resource state reset/dump/restore functionality
  * Access to official clients without abstractions (`amqplib`, `ioredis`, `@elastic/elasticsearch`)
* **Service introspection** capabilities
  * Health checks via `GET /healthz`
  * Introspection endpoints via `GET /introspection`
  * Configuration and state access
  * Metrics collection

## Getting Started

### Installation

```shell
npm install -D @duwab/test-kit
```

### Docker Setup (Development & Testing)

To start all required services:

```bash
docker-compose up -d
```

This will start:
- **RabbitMQ** on `localhost:5672` (Management UI: `localhost:15672`)
- **Redis** on `localhost:6379`
- **ElasticSearch** on `localhost:9200`

To stop services:

```bash
docker-compose down
```

## Usage Examples

### RabbitMQ Client

```typescript
import { RabbitMQClient } from '@duwab/test-kit';

const client = new RabbitMQClient({
  host: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
});

await client.connect();

// Get all queues with their statistics
const queues = await client.getAllQueues();

// Declare a queue
await client.declareQueue('my-queue', { durable: true });

// Publish a message
await client.publishMessage('my-exchange', 'routing-key', { data: 'message' });

// Get official amqplib client
const amqplibClient = await client.getOfficialClient();

// Dump state to snapshot
await client.dump('./snapshots/rabbitmq.json', { pretty: true });

// Restore from snapshot
await client.restore('./snapshots/rabbitmq.json');

await client.disconnect();
```

### Redis Client

```typescript
import { RedisClient } from '@duwab/test-kit';

const client = new RedisClient({
  host: 'localhost',
  port: 6379,
});

await client.connect();

// Set a value with TTL
await client.set('mykey', 'myvalue', 3600);

// Get a value
const value = await client.get('mykey');

// Get all keys matching pattern
const keys = await client.getAllKeys('user:*');

// Delete keys by pattern
await client.deleteByPattern('temp:*');

// Flush entire database
await client.flushDB();

// Get official ioredis client
const ioredisClient = await client.getOfficialClient();

// Dump and restore state
await client.dump('./snapshots/redis.json', { pretty: true });
await client.restore('./snapshots/redis.json');

await client.disconnect();
```

### ElasticSearch Client

```typescript
import { ElasticSearchClient } from '@duwab/test-kit';

const client = new ElasticSearchClient({
  host: 'localhost',
  port: 9200,
});

await client.connect();

// Create an index
await client.createIndex('products');

// Index a document
await client.indexDocument('products', '1', {
  name: 'Product 1',
  price: 99.99,
});

// Get a document
const doc = await client.getDocument('products', '1');

// Search documents
const results = await client.search({
  index: 'products',
  query: { match_all: {} },
});

// Get all documents in an index
const allDocs = await client.getAllDocuments('products');

// Delete a document
await client.deleteDocument('products', '1');

// Get official Elasticsearch client
const esClient = await client.getOfficialClient();

// Dump and restore state
await client.dump('./snapshots/elasticsearch.json', { pretty: true });
await client.restore('./snapshots/elasticsearch.json');

await client.disconnect();
```

## Project Structure

```
├── src/
│   ├── base.ts                    # Base client class and interfaces
│   ├── index.ts                   # Main export file
│   └── clients/
│       ├── rabbitmq.ts            # RabbitMQ client implementation
│       ├── redis.ts               # Redis client implementation
│       └── elasticsearch.ts       # ElasticSearch client implementation
├── examples/
│   └── usage.ts                   # Usage examples for all clients
├── tests/
│   └── e2e/                       # End-to-end tests
├── docker-compose.yml             # Docker services configuration
├── package.json                   # Project dependencies
├── tsconfig.json                  # TypeScript configuration
├── jest.config.js                 # Jest testing configuration
├── .eslintrc.json                 # ESLint configuration
└── .prettierrc                    # Prettier code formatting
```

## Available Scripts

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run e2e tests with Docker
npm run test:e2e

# Run linter
npm run lint

# Format code with Prettier
npm run format

# Clean build output
npm run clean
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest

REDIS_HOST=localhost
REDIS_PORT=6379

ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
```

## Testing

Run tests with Docker services:

```bash
npm run test:e2e
```

This will:
1. Start Docker containers
2. Run all tests
3. Stop Docker containers

## Features by Provider

### RabbitMQ
- ✅ Queue management (create, delete, purge)
- ✅ Exchange and binding management
- ✅ Message publishing
- ✅ Queue statistics
- ✅ State dump/restore via Management API
- ✅ Official amqplib client access

### Redis
- ✅ Key-value operations
- ✅ Pattern-based key listing and deletion
- ✅ Database flushing
- ✅ Database statistics
- ✅ State dump/restore
- ✅ Official ioredis client access

### ElasticSearch
- ✅ Index management (create, delete)
- ✅ Document CRUD operations
- ✅ Full-text search
- ✅ Index statistics
- ✅ Bulk document operations
- ✅ State dump/restore
- ✅ Official Elasticsearch client access

## Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.

## License

MIT

A npm package written in Typescript to help running e2e tests for NodeJS and Typescript micro-services for distributed architectures.

Main features :

* Tools for tests based on RabbitMQ, Redis, ElasticSearch and MySQL
  * simplified client creation
  * simplified helpers to create/update/read/delete resources
  * simplified functions for _global listing_
  * simplified resoures state reset/dump/restore
  * provides an official client to interact with servers without abstractions (`amqplib`, `ioredis`, `@elastic/elasticsearch`, `mysql2`)
* Read micro services state by fetching standards endpoints
  * `GET /healthz`
    * service health that tells if the service is running
  * `GET /introspection`
    * service introspection, that contains custom advanced details
      * final configuration
      * current state (working, maintenance, waiting for _something_, exiting, ...)
      * pending actions (refreshs, dispose, ...)
      * processing stats
      * common nodejs metrics (event loop, ...)
  * ..._other suggestions would be appreciated_

> **Remark:** by _simplified_, understand that we provide one shot functions with few parameters for most operations during e2e testing
>
> We consider that during testing, we are able to quickly fetch all the data stored by associated provider

## Getting Started

```shell
npm i -D @duwab/test-kit
```

Usage in NodeJS

```javascript
import { RabbtiMQClient } from '@duwab/test-kit'
const client = new RabbitMQClient(credentials);
await client.getAllQueues(options?); // loops every queues to read current stats (messages counts by status ready/unack/total)

const amqplibClient = await client.getOfficialClient(); // returns the official (or most relevant) client for this technology

await client.dump(snapshotFile);
await client.restore(snapshotFile);
```
