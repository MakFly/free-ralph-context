# Ralph API - Makefile
#
# Usage:
#   make up        - Start all services (PostgreSQL, Redis, API)
#   make down      - Stop all services
#   make logs      - Follow logs
#   make restart   - Restart API service
#   make shell     - Open shell in API container
#   make migrate   - Run database migrations
#   make test      - Run tests
#   make clean     - Remove containers, volumes, and cache

.PHONY: up down logs restart shell migrate test clean build dev infra health

# Default target
.DEFAULT_GOAL := up

# Docker compose file
DC := docker-compose

# ============================================================
# MAIN COMMANDS
# ============================================================

## Start all services (PostgreSQL, Redis, API)
up: infra
	@echo "🚀 Starting Ralph API..."
	$(DC) up -d api
	@echo "⏳ Waiting for API to be healthy..."
	@sleep 5
	@make health

## Start only infrastructure (PostgreSQL, Redis)
infra:
	@echo "🔧 Starting infrastructure..."
	$(DC) up -d postgres redis
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 3
	@$(DC) ps

## Stop all services
down:
	@echo "🛑 Stopping all services..."
	$(DC) down

## Follow logs
logs:
	$(DC) logs -f

## Restart API service only
restart:
	@echo "🔄 Restarting API..."
	$(DC) restart api

## Build API image
build:
	@echo "🏗️ Building API image..."
	$(DC) build api

# ============================================================
# DEVELOPMENT
# ============================================================

## Run API locally (without Docker)
dev: infra
	@echo "🚀 Starting API locally..."
	uvicorn app.main:app --reload --port 8000

## Open shell in API container
shell:
	$(DC) exec api /bin/bash

## Run database migrations
migrate:
	@echo "📦 Running migrations..."
	$(DC) exec api alembic upgrade head

## Run tests
test:
	@echo "🧪 Running tests..."
	$(DC) exec api pytest -v

# ============================================================
# HEALTH & STATUS
# ============================================================

## Check health of all services
health:
	@echo "🏥 Checking health..."
	@echo ""
	@echo "📊 Services Status:"
	@$(DC) ps
	@echo ""
	@echo "🔗 Endpoints:"
	@echo "   - API:      http://localhost:8000"
	@echo "   - Docs:     http://localhost:8000/docs"
	@echo "   - Status:   http://localhost:8000/status"
	@echo "   - Health:   http://localhost:8000/health/"
	@echo "   - SSE:      http://localhost:8000/events"
	@echo ""
	@curl -s http://localhost:8000/health/ 2>/dev/null || echo "⚠️  API not responding yet"

## Show service status
status:
	@$(DC) ps
	@echo ""
	@curl -s http://localhost:8000/status 2>/dev/null | python3 -m json.tool || echo "API not running"

# ============================================================
# CLEANUP
# ============================================================

## Remove containers, volumes, and cache
clean:
	@echo "🧹 Cleaning up..."
	$(DC) down -v --remove-orphans
	docker system prune -f
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleanup complete"

## Reset database (DANGER: deletes all data)
reset-db:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(DC) down -v postgres
	$(DC) up -d postgres
	@sleep 5
	@make migrate
	@echo "✅ Database reset complete"

# ============================================================
# HELP
# ============================================================

## Show help
help:
	@echo "Ralph API - Available commands:"
	@echo ""
	@echo "  make up        Start all services"
	@echo "  make down      Stop all services"
	@echo "  make logs      Follow logs"
	@echo "  make restart   Restart API"
	@echo "  make dev       Run API locally (infra in Docker)"
	@echo "  make build     Build API image"
	@echo "  make shell     Open shell in API container"
	@echo "  make migrate   Run database migrations"
	@echo "  make test      Run tests"
	@echo "  make health    Check service health"
	@echo "  make status    Show status"
	@echo "  make clean     Clean up everything"
	@echo "  make reset-db  Reset database (DANGER)"
	@echo ""
