# Docker Deployment

Faramesh provides Docker support for easy deployment and development. This guide covers Docker Compose, custom builds, and production deployment.

## Quick Start

### One-Line Demo

```bash
docker compose up
```

Then open `http://localhost:8000` in your browser.

This starts:
- **faramesh** - Main API server + Web UI
- **demo-agent** - Example agent that continuously submits actions

---

## Docker Compose

### Basic Setup

The `docker-compose.yaml` file includes:

```yaml
version: '3.8'

services:
  faramesh:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FARAMESH_HOST=0.0.0.0
      - FARAMESH_PORT=8000
      - FARAMESH_ENABLE_CORS=1
      - FARAMESH_DEMO=1
      - FARA_POLICY_FILE=policies/default.yaml
    volumes:
      - ./data:/app/data
      - ./policies:/app/policies
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  demo-agent:
    build:
      context: .
      dockerfile: Dockerfile.demo
    depends_on:
      - faramesh
    environment:
      - FARA_API_BASE=http://faramesh:8000
      - FARA_AGENT_ID=demo-agent
    command: python /app/demo_agent.py
```

### Services

**faramesh:**
- Main Faramesh server
- Exposes port 8000
- Mounts `./data` for SQLite database
- Mounts `./policies` for policy files
- Health check endpoint

**demo-agent:**
- Example agent that submits actions
- Depends on faramesh service
- Continuously submits sample actions

### Custom Configuration

Edit `docker-compose.yaml` to customize:

```yaml
services:
  faramesh:
    build: .
    ports:
      - "9000:8000"  # Custom port
    environment:
      - FARAMESH_HOST=0.0.0.0
      - FARAMESH_PORT=8000
      - FARAMESH_TOKEN=my-secret-token  # Enable auth
      - FARAMESH_DEMO=1
      - FARA_POLICY_FILE=policies/custom.yaml
    volumes:
      - ./data:/app/data
      - ./policies:/app/policies
```

### Using Environment File

Create `.env`:

```env
FARAMESH_HOST=0.0.0.0
FARAMESH_PORT=8000
FARAMESH_TOKEN=my-secret-token
FARAMESH_ENABLE_CORS=1
FARAMESH_DEMO=1
FARA_POLICY_FILE=policies/default.yaml
FARA_DB_BACKEND=sqlite
FARA_SQLITE_PATH=/app/data/actions.db
```

Then:

```bash
docker compose --env-file .env up
```

---

## Dockerfile

### Main Dockerfile

The main `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml ./
COPY src/ ./src/
COPY policies/ ./policies/
COPY alembic.ini ./
COPY alembic/ ./alembic/

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Set environment variables with defaults
ENV FARAMESH_HOST=0.0.0.0
ENV FARAMESH_PORT=8000
ENV FARAMESH_ENABLE_CORS=1
ENV FARA_DB_BACKEND=sqlite
ENV FARA_SQLITE_PATH=/app/data/actions.db

# Run migrations and start server
CMD ["sh", "-c", "faramesh migrate && faramesh serve --host ${FARAMESH_HOST} --port ${FARAMESH_PORT}"]
```

### Demo Agent Dockerfile

The `Dockerfile.demo` builds the demo agent:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY examples/docker/demo_agent.py /app/demo_agent.py
COPY pyproject.toml ./
COPY src/ ./src/

RUN pip install --no-cache-dir -e .

CMD ["python", "/app/demo_agent.py"]
```

---

## Custom Build

### Build Image

```bash
docker build -t faramesh:latest .
```

### Run Container

```bash
docker run -p 8000:8000 \
  -e FARAMESH_HOST=0.0.0.0 \
  -e FARAMESH_PORT=8000 \
  -e FARAMESH_TOKEN=my-secret-token \
  -v $(pwd)/policies:/app/policies \
  -v $(pwd)/data:/app/data \
  faramesh:latest
```

### With Custom Policy

```bash
docker run -p 8000:8000 \
  -e FARA_POLICY_FILE=/app/policies/custom.yaml \
  -v $(pwd)/policies:/app/policies \
  -v $(pwd)/data:/app/data \
  faramesh:latest
```

---

## PostgreSQL Setup

### Docker Compose with PostgreSQL

Add PostgreSQL service to `docker-compose.yaml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=faramesh
      - POSTGRES_PASSWORD=faramesh-password
      - POSTGRES_DB=faramesh
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  faramesh:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FARAMESH_HOST=0.0.0.0
      - FARAMESH_PORT=8000
      - FARA_DB_BACKEND=postgres
      - FARA_POSTGRES_DSN=postgresql://faramesh:faramesh-password@postgres:5432/faramesh
      - FARA_POLICY_FILE=policies/default.yaml
    volumes:
      - ./policies:/app/policies
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Run with PostgreSQL

```bash
docker compose up
```

Migrations run automatically on container start.

---

## Production Deployment

### Best Practices

1. **Use PostgreSQL**: SQLite is fine for development, but use PostgreSQL for production
2. **Set Authentication**: Always set `FARAMESH_TOKEN` in production
3. **Use Secrets Management**: Don't hardcode tokens in Dockerfiles
4. **Persistent Volumes**: Use named volumes for database and policies
5. **Health Checks**: Use health check endpoints for orchestration
6. **Resource Limits**: Set CPU and memory limits

### Example Production Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  faramesh:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FARAMESH_HOST=0.0.0.0
      - FARAMESH_PORT=8000
      - FARAMESH_TOKEN=${FARAMESH_TOKEN}
      - FARA_DB_BACKEND=postgres
      - FARA_POSTGRES_DSN=${FARA_POSTGRES_DSN}
      - FARA_POLICY_FILE=/app/policies/production.yaml
    volumes:
      - ./policies:/app/policies:ro  # Read-only for security
    depends_on:
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

volumes:
  postgres_data:
```

### Using Secrets

```yaml
services:
  faramesh:
    environment:
      - FARAMESH_TOKEN_FILE=/run/secrets/faramesh_token
    secrets:
      - faramesh_token

secrets:
  faramesh_token:
    file: ./secrets/faramesh_token.txt
```

---

## Kubernetes Deployment

### Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: faramesh
spec:
  replicas: 2
  selector:
    matchLabels:
      app: faramesh
  template:
    metadata:
      labels:
        app: faramesh
    spec:
      containers:
      - name: faramesh
        image: faramesh:latest
        ports:
        - containerPort: 8000
        env:
        - name: FARAMESH_HOST
          value: "0.0.0.0"
        - name: FARAMESH_PORT
          value: "8000"
        - name: FARAMESH_TOKEN
          valueFrom:
            secretKeyRef:
              name: faramesh-secrets
              key: token
        - name: FARA_DB_BACKEND
          value: "postgres"
        - name: FARA_POSTGRES_DSN
          valueFrom:
            secretKeyRef:
              name: faramesh-secrets
              key: postgres_dsn
        volumeMounts:
        - name: policies
          mountPath: /app/policies
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: policies
        configMap:
          name: faramesh-policies
---
apiVersion: v1
kind: Service
metadata:
  name: faramesh
spec:
  selector:
    app: faramesh
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

---

## Troubleshooting

### Container Won't Start

**Check:**
1. Port 8000 is available: `lsof -i :8000`
2. Docker daemon is running: `docker ps`
3. Check logs: `docker compose logs faramesh`

### Database Connection Issues

**For PostgreSQL:**
1. Ensure PostgreSQL container is running: `docker compose ps`
2. Check connection string: `FARA_POSTGRES_DSN`
3. Verify network connectivity between containers
4. Check PostgreSQL logs: `docker compose logs postgres`

### Policy File Not Found

**Check:**
1. Volume mount is correct: `-v $(pwd)/policies:/app/policies`
2. Policy file exists: `ls policies/default.yaml`
3. File permissions are correct

### Demo Agent Not Working

**Check:**
1. Demo agent container is running: `docker compose ps`
2. Faramesh service is accessible: `docker compose exec demo-agent curl http://faramesh:8000/health`
3. Check demo agent logs: `docker compose logs demo-agent`

---

## Environment Variables

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FARAMESH_HOST` | `0.0.0.0` | Server bind address |
| `FARAMESH_PORT` | `8000` | Server port |
| `FARAMESH_TOKEN` | - | Auth token |
| `FARAMESH_ENABLE_CORS` | `1` | Enable CORS |
| `FARAMESH_DEMO` | - | Demo mode (seed data) |

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FARA_DB_BACKEND` | `sqlite` | Database backend |
| `FARA_SQLITE_PATH` | `/app/data/actions.db` | SQLite path |
| `FARA_POSTGRES_DSN` | - | PostgreSQL connection string |

### Policy Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FARA_POLICY_FILE` | `policies/default.yaml` | Policy file path |

---

## See Also

- [Quick Start](../QUICKSTART.md) - Local setup guide
- [API Reference](API.md) - REST API endpoints
- [CLI Reference](CLI.md) - Command-line interface
- [Troubleshooting](Troubleshooting.md) - Common issues and fixes
