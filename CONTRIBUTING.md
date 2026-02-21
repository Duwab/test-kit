# Contributing to Test Kit

Thank you for your interest in contributing to the Test Kit project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive when interacting with other contributors.

## How to Contribute

### Reporting Bugs

- Use the issue tracker to report bugs
- Check if the issue already exists
- Provide a clear, descriptive title and description
- Include steps to reproduce the problem
- Include expected and actual behavior
- Specify your environment (Node version, OS, etc.)

### Suggesting Enhancements

- Use the issue tracker for feature requests
- Clearly describe the enhancement and its motivation
- Explain the expected behavior
- Consider backward compatibility

### Pull Requests

1. **Fork the repository** and create your branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Set up your environment**
   ```bash
   npm install
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation if needed
   - Ensure all tests pass

4. **Run tests and linting**
   ```bash
   npm run lint
   npm run format
   npm run test
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: Add new feature"
   git commit -m "fix: Fix issue with X"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Provide a clear description of your changes
   - Reference any related issues
   - Ensure CI checks pass

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for testing with services)

### Getting Started

```bash
# Install dependencies
npm install

# Start development mode with TypeScript watch
npm run dev

# Start Docker services
docker-compose up -d

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Format code
npm run format

# Run linter
npm run lint
```

## Code Style

- Follow the `.eslintrc.json` configuration
- Use `npm run format` to format code with Prettier
- Use clear and descriptive variable/function names
- Add JSDoc comments for public APIs
- Keep functions focused and small

### TypeScript Guidelines

- Always use explicit types
- Avoid `any` type unless absolutely necessary
- Use `interface` for object shapes
- Use `type` for unions or complex types
- Make readonly when appropriate

## Testing

- Write tests for all new features
- Test both happy path and edge cases
- Use descriptive test names
- Keep tests isolated and fast
- Aim for at least 80% code coverage

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to public APIs
- Include examples for new features
- Update type definitions if needed

## Adding a New Client

To add support for a new provider:

1. Create a new file in `src/clients/`
   ```typescript
   // src/clients/newprovider.ts
   import { BaseTestClient } from '../base';

   export class NewProviderClient extends BaseTestClient {
     async connect(): Promise<void> { }
     async disconnect(): Promise<void> { }
     async dump(): Promise<void> { }
     async restore(): Promise<void> { }
   }
   ```

2. Export from `src/index.ts`
   ```typescript
   export { NewProviderClient } from './clients/newprovider';
   ```

3. Add tests in `tests/e2e/newprovider.spec.ts`

4. Update `docker-compose.yml` with the service
   ```yaml
   newprovider:
     image: ...
     ports:
       - "port:port"
   ```

5. Update README.md with examples

## Commit Message Format

Use conventional commits:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test changes
- `refactor:` for code refactoring
- `perf:` for performance improvements
- `chore:` for maintenance tasks

Example:
```
feat: Add MongoDB client support

- Implement MongoDB client class
- Add connection pooling
- Add dump/restore functionality
```

## Questions?

- Create an issue with the `question` label
- Check existing issues and discussions
- Refer to the README.md and examples

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
