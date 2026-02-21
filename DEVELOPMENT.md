# Test Kit Development Guide

## Quick Start

1. **Clone and install**
   ```bash
   git clone <repository>
   cd test-kit
   npm install
   ```

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **Run tests**
   ```bash
   npm run test:e2e
   ```

4. **Build the package**
   ```bash
   npm run build
   ```

## Architecture

### Client Hierarchy

```
BaseTestClient (abstract)
├── RabbitMQClient
├── RedisClient
└── ElasticSearchClient
```

### Key Methods All Clients Implement

- `connect()` - Establish connection to service
- `disconnect()` - Close connection
- `dump(path)` - Export state to JSON snapshot
- `restore(path)` - Import state from JSON snapshot
- `getOfficialClient()` - Access original client library

### Common Patterns

All clients follow these patterns:

```typescript
// Connection management
const client = new XyzClient(credentials);
await client.connect();
// ... use client ...
await client.disconnect();

// Resilience with retry
protected async retry<T>(fn: () => Promise<T>, maxRetries?: number)

// Helper for delays
protected async sleep(ms: number)
```

## Docker Services

### RabbitMQ

- **AMQP Port**: 5672
- **Management UI**: http://localhost:15672
- **Default Credentials**: guest / guest
- **Features**:
  - Queue and exchange management
  - Message publishing
  - Management API access

### Redis

- **Port**: 6379
- **Features**:
  - Key-value storage
  - Pattern-based operations
  - TTL support
  - Database flushing

### Elasticsearch

- **Port**: 9200
- **Dashboard**: http://localhost:9200
- **Features**:
  - Full-text search
  - Document storage
  - Index management
  - Analytics

## State Snapshots

Snapshots are stored as JSON files with this structure:

```json
{
  "timestamp": 1234567890,
  "provider": "rabbitmq",
  "version": "1.0",
  "data": [
    {
      "type": "definitions|data|indices",
      "timestamp": 1234567890,
      "data": { /* provider-specific data */ }
    }
  ]
}
```

### Use Cases

- **Testing**: Dump clean state before tests, restore after failures
- **Debugging**: Capture production-like state
- **Documentation**: Show before/after complex operations

## Environment Configuration

Create `.env` from `.env.example`:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Testing Strategy

### Unit Tests

- Test client methods independently
- Mock external dependencies when needed
- Fast and isolated

```typescript
describe('Client', () => {
  test('should handle operation', async () => {
    // Test specific method
  });
});
```

### E2E Tests

- Test against real Docker services
- Verify full workflows
- Use snapshots for state management

```bash
npm run test:e2e
# Starts Docker, runs tests, stops Docker
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint
      - run: npm run build
      - name: Start services
        run: docker-compose up -d
      - name: Run tests
        run: npm run test:e2e
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Stop and restart
docker-compose down
docker-compose up -d
```

### Connection errors

- Ensure Docker services are healthy: `docker-compose ps`
- Check environment variables in `.env`
- Verify firewall/network rules

### Tests timing out

- Increase timeout in `jest.config.js`
- Check service health: `docker-compose logs`
- Ensure sufficient system resources

## Performance Tips

1. **Reuse clients** - Don't create new clients for each test
2. **Batch operations** - Combine multiple operations when possible
3. **Use patterns** - Leverage pattern-based deletion/listing
4. **Index management** - Delete old test indices after tests

## Debugging

### Enable debug logs

```typescript
// In test files
process.env.DEBUG = 'test-kit:*';
```

### Check service status

```bash
# RabbitMQ
curl http://localhost:15672/api/overview

# Redis
redis-cli ping

# Elasticsearch
curl http://localhost:9200/_cluster/health
```

## Best Practices

1. ✅ Always disconnect clients after use
2. ✅ Use try/finally for cleanup
3. ✅ Snapshot state before destructive operations
4. ✅ Test with realistic data volumes
5. ✅ Monitor service resource usage
6. ✅ Document complex test scenarios
7. ✅ Use descriptive test names

## Resources

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Redis Documentation](https://redis.io/documentation)
- [Elasticsearch Documentation](https://www.elastic.co/guide/index.html)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
