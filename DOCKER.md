# Docker Deployment Guide

## Quick Start

### 1. Build and Run

```bash
docker-compose up -d
```

### 2. Access Application

Open your browser and navigate to: `http://localhost:3000`

### 3. Stop Application

```bash
docker-compose down
```

## Commands

### Build only
```bash
docker-compose build
```

### View logs
```bash
docker-compose logs -f app
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

## Data Persistence

- Database file (`app.db`) is stored in Docker volume `app-data`
- Data persists even when container is stopped/removed
- To remove all data: `docker-compose down -v`

## Environment Variables

You can customize by editing `docker-compose.yml`:

- `DATABASE_PATH`: Path to SQLite database (default: `/app/data/app.db`)
- `NODE_ENV`: Environment mode (default: `production`)

## Production Deployment

1. Update `docker-compose.yml` with your domain/port
2. Add reverse proxy (nginx/traefik) if needed
3. Set up SSL certificates
4. Configure backup for `app-data` volume

