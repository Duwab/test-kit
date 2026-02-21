# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-21

### Added

- Initial release of @duwab/test-kit
- RabbitMQ client with full support:
  - Queue management (create, delete, purge)
  - Exchange and binding management
  - Message publishing
  - Queue statistics
  - State dump and restore via Management API
  - Official amqplib client access
- Redis client with full support:
  - Key-value operations
  - Pattern-based operations
  - TTL support
  - Database flushing
  - State dump and restore
  - Official ioredis client access
- ElasticSearch client with full support:
  - Index management
  - Document CRUD operations
  - Full-text search
  - Index statistics
  - State dump and restore
  - Official Elasticsearch client access
- Docker Compose configuration for local development
- Comprehensive test suite with e2e tests
- Documentation and examples
- CI/CD pipeline with GitHub Actions
- ESLint and Prettier configuration
- Jest configuration for testing

### Development Tools

- TypeScript 5.3+
- ESLint for code quality
- Prettier for code formatting
- Jest for testing
- Docker support for services

## Future Plans

- MySQL/MariaDB client support
- PostgreSQL client support
- MongoDB client support
- HTTP client for service health checks
- Advanced metrics collection
- Performance optimization
- Additional snapshot formats (YAML, etc.)

---

For detailed information, see [README.md](./README.md) and [DEVELOPMENT.md](./DEVELOPMENT.md).
