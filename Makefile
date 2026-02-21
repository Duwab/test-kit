.PHONY: help install clean build dev test lint format start-services stop-services logs

help:
	@echo "Available commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make build          - Build the project"
	@echo "  make dev            - Start development watch mode"
	@echo "  make test           - Run all tests"
	@echo "  make test-watch     - Run tests in watch mode"
	@echo "  make test-e2e       - Run e2e tests with Docker"
	@echo "  make lint           - Run eslint"
	@echo "  make format         - Format code with prettier"
	@echo "  make start-services - Start Docker services"
	@echo "  make stop-services  - Stop Docker services"
	@echo "  make logs           - Show Docker logs"
	@echo "  make compose-dev    - Start services in dev mode"

install:
	npm install

clean:
	npm run clean
	rm -rf test-snapshots/

build:
	npm run build

dev:
	npm run dev

test:
	npm run test

test-watch:
	npm run test:watch

test-e2e:
	npm run test:e2e

lint:
	npm run lint

format:
	npm run format

start-services:
	docker-compose up -d

stop-services:
	docker-compose down

logs:
	docker-compose logs -f

compose-dev:
	docker-compose -f docker-compose.dev.yml up -d

compose-dev-down:
	docker-compose -f docker-compose.dev.yml down

compose-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Development workflow targets
setup: install start-services
	@echo "Setup complete! Services are running."

teardown: stop-services clean
	@echo "Teardown complete!"

# Quality checks
quality: lint build test
	@echo "All quality checks passed!"

# Full development workflow
workflow: clean install lint build test:e2e
	@echo "Full workflow completed successfully!"
