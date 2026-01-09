# 🚀 Node Caching Proxy

A high-performance, production-ready HTTP caching proxy server built with Node.js. Features dual-layer caching (Redis + LRU), intelligent request deduplication, automatic retry logic, and comprehensive security hardening.

## ✨ Features

- **Dual-Layer Caching**: Redis for distributed caching + LRU fallback for graceful degradation
- **Request Deduplication**: Prevents thundering herd by deduplicating in-flight requests
- **Automatic Retries**: Exponential backoff retry logic for resilience
- **SSRF Protection**: Private IP blocking and URL validation to prevent attacks
- **Health Checks**: Built-in health check endpoint for Kubernetes/Docker integration
- **Advanced Metrics**: Hit ratios, latency tracking, error rates, and cache layer breakdown
- **Graceful Shutdown**: Proper signal handling for zero-downtime deployments
- **Cache Management**: Manual cache invalidation endpoints
- **Configuration Validation**: Fails fast with clear error messages
- **Production-Ready**: Comprehensive error handling and logging

## 🛠️ Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Caching**: Redis + LRU-Cache
- **Rate Limiting**: express-rate-limit
- **HTTP Client**: node-fetch

## 📋 Prerequisites

- Node.js >= 16.x
- Redis server (optional, with LRU fallback)
- npm or yarn

## 🚀 Quick Start

### Local Development

#### 1. Clone & Install

```bash
git clone https://github.com/sampremm/node-caching-proxy.git
cd node-caching-proxy
npm install
```

#### 2. Configure

```bash
# Copy example configuration
cp .env.example .env

# Edit with your settings (optional, defaults are provided)
nano .env
```

#### 3. Start the Server

```bash
npm start
```

Expected output:

```
✅ Configuration validated successfully
Connected to Redis
🚀 Proxy server running on port 9000
📊 Metrics available at http://localhost:9000/metrics
💚 Health check at http://localhost:9000/health
```

#### 4. Test It

```bash
# Proxy a request
curl "http://localhost:9000/proxy?url=https://api.github.com/users/github"

# Check health
curl http://localhost:9000/health

# View metrics
curl http://localhost:9000/metrics
```

### Docker Compose (Recommended)

The easiest way to run with Redis included:

```bash
# Clone the repository
git clone https://github.com/sampremm/node-caching-proxy.git
cd node-caching-proxy

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f proxcy-server
```

**What's included:**

- Caching Proxy server on port `7000` (maps to `9000` internally)
- Redis service on port `6379`
- Health checks for both services
- Persistent Redis data volume
- Automatic restart on failure

**Test it:**

```bash
# Proxy request
curl "http://localhost:7000/proxy?url=https://api.github.com/users/github"

# Health check
curl http://localhost:7000/health

# Metrics
curl http://localhost:7000/metrics

# Clear cache
curl -X POST "http://localhost:7000/cache/clear"
```

**Useful commands:**

```bash
# View logs
docker-compose logs -f proxcy-server

# Stop services
docker-compose down

# Remove data volumes
docker-compose down -v

# Rebuild and restart
docker-compose up --build -d
```

## 📖 API Documentation

### Proxy Endpoint

**GET** `/proxy?url=<URL>`

Proxies a request through the caching layer.

**Parameters:**

- `url` (required): The URL to proxy. Protocol (http/https) is auto-detected.

**Example:**

```bash
curl "http://localhost:9000/proxy?url=https://jsonplaceholder.typicode.com/posts/1"

curl "http://localhost:9000/proxy?url=api.example.com/data"  # https:// added automatically
```

**Response:**

```json
{
  "userId": 1,
  "id": 1,
  "title": "...",
  "body": "..."
}
```

**Status Codes:**

- `200`: Success (from cache or upstream)
- `400`: Invalid request (missing/invalid URL)
- `403`: SSRF prevention (private IP blocked)
- `502`: Upstream API error
- `504`: Request timeout

---

### Health Check

**GET** `/health`

Returns server health status including Redis connection.

**Example:**

```bash
curl http://localhost:9000/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-09T10:30:00.000Z",
  "redis": "connected"
}
```

**Status Codes:**

- `200`: All systems operational
- `503`: Degraded (Redis unavailable, LRU fallback active)

---

### Metrics

**GET** `/metrics`

View cache performance statistics.

**Example:**

```bash
curl http://localhost:9000/metrics
```

**Response:**

```json
{
  "hits": 45,
  "misses": 12,
  "errors": 2,
  "totalRequests": 57,
  "hitRatio": 0.789,
  "avgLatencyMs": "123.45",
  "cacheLayerBreakdown": {
    "redis": 30,
    "lru": 15,
    "miss": 12
  },
  "errorRate": 0.035
}
```

---

### Clear Cache

**POST** `/cache/clear`

Clear specific cache entries or all cached data.

**Parameters:**

- `url` (optional): Specific URL to clear. If omitted, clears all cache.

**Examples:**

```bash
# Clear specific URL
curl -X POST "http://localhost:9000/cache/clear?url=https://api.github.com/users/github"

# Clear all cache
curl -X POST "http://localhost:9000/cache/clear"
```

**Response:**

```json
{
  "success": true,
  "message": "Cleared cache for https://api.github.com/users/github"
}
```

---

### Reset Metrics

**POST** `/metrics/reset`

Reset all metrics counters.

**Example:**

```bash
curl -X POST "http://localhost:9000/metrics/reset"
```

**Response:**

```json
{
  "success": true,
  "message": "Metrics reset"
}
```

## ⚙️ Configuration

All configuration uses environment variables. See `.env.example` for defaults.

| Variable           | Default          | Description                              |
| ------------------ | ---------------- | ---------------------------------------- |
| `PORT`             | `9000`           | Server port                              |
| `REDIS_URL`        | `localhost:6379` | Redis connection URL                     |
| `USE_REDIS`        | `true`           | Enable/disable Redis                     |
| `CACHE_TTL_SEC`    | `60`             | Cache time-to-live in seconds            |
| `FETCH_TIMEOUT_MS` | `5000`           | Upstream request timeout in milliseconds |
| `MAX_RETRIES`      | `2`              | Retry attempts on failure                |
| `NODE_ENV`         | `development`    | Environment mode                         |

### Example .env

```env
# Server Configuration
PORT=9000
NODE_ENV=production

# Cache Configuration
CACHE_TTL_SEC=300
FETCH_TIMEOUT_MS=10000
MAX_RETRIES=3

# Redis Configuration
REDIS_URL=redis://localhost:6379
USE_REDIS=true
```

## 🔒 Security

The proxy includes several security features:

- **SSRF Prevention**: Blocks requests to private IP ranges (10.x.x.x, 127.x.x.x, 172.16-31.x.x, 192.168.x.x)
- **URL Validation**: Strict URL format validation
- **Protocol Enforcement**: Only HTTP/HTTPS allowed
- **Rate Limiting**: 60 requests per minute per IP
- **Error Obfuscation**: Doesn't leak sensitive information in responses

### Protected IP Ranges

- `10.0.0.0/8` (Private networks)
- `127.0.0.0/8` (Loopback)
- `172.16.0.0/12` (Private networks)
- `192.168.0.0/16` (Private networks)
- `169.254.0.0/16` (Link-local)
- IPv6 private ranges (fc00::/7, fe80::/10)

## 🏗️ Architecture

```
Request
   ↓
[Rate Limiter] → [Security] → [Cache Middleware]
   ↓
[Proxy Route]
   ├→ Redis Cache (Primary)
   ├→ LRU Cache (Fallback)
   └→ Upstream API (Cache Miss)
   ↓
Response (with metrics tracking)
```

## 🚢 Deployment

### Docker Compose (Single Command)

```bash
docker-compose up -d
```

The `docker-compose.yml` includes:

- Proxy server with auto-restart
- Redis with persistent storage
- Health checks for both services
- Custom bridge network

See [docker-compose.yml](docker-compose.yml) for full configuration.

### Docker

Build and run a single container:

```bash
# Build
docker build -t caching-proxy:latest .

# Run with Redis
docker run -d \
  -p 9000:9000 \
  -e REDIS_URL=redis://redis:6379 \
  --link redis:redis \
  caching-proxy:latest
```

Or use the provided Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:9000/health').then(r => r.status === 200 || process.exit(1))"

CMD ["npm", "start"]
```

### Kubernetes

Deploy to Kubernetes with proper health checks:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: caching-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: caching-proxy
  template:
    metadata:
      labels:
        app: caching-proxy
    spec:
      containers:
        - name: proxy
          image: caching-proxy:latest
          ports:
            - containerPort: 9000
          env:
            - name: REDIS_URL
              value: "redis://redis-service:6379"
            - name: NODE_ENV
              value: "production"
          livenessProbe:
            httpGet:
              path: /health
              port: 9000
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 9000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: caching-proxy
spec:
  selector:
    app: caching-proxy
  ports:
    - port: 80
      targetPort: 9000
  type: LoadBalancer
```

### Environment Setup

**Development:**

```bash
npm install
npm start
```

**Production:**

```bash
npm ci --only=production
NODE_ENV=production npm start
```

**Docker Production:**

```bash
docker build -t caching-proxy:latest .
docker run -d \
  -p 9000:9000 \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://redis:6379 \
  caching-proxy:latest
```

## 📊 Performance

### Caching Strategy

1. **Redis** (Primary, ~5ms latency)

   - Distributed cache
   - Survives restarts
   - Best for multiple instances

2. **LRU** (Fallback, ~1ms latency)

   - In-memory cache
   - Per-instance
   - Active when Redis unavailable

3. **Upstream** (Miss, ~500ms+ latency)
   - Original API call
   - Auto-deduplication for in-flight requests
   - Automatic retry with backoff

### Expected Hit Ratios

- Cold start: 0%
- After 1 hour: 60-80%
- After 24 hours: 85-95%

(Depends on cache TTL and request patterns)

## 🧪 Testing

```bash
# Check syntax
node --check src/server.js

# Run the server
npm start

# In another terminal:

# Test proxy
curl "http://localhost:9000/proxy?url=https://jsonplaceholder.typicode.com/posts/1"

# Test health
curl http://localhost:9000/health

# Test cache clear
curl -X POST "http://localhost:9000/cache/clear"

# Test metrics
curl http://localhost:9000/metrics
```

## 📝 Logs

Check logs in stdout. Set `NODE_ENV=production` to reduce verbosity.

### Log Levels

- `info`: Server startup, connections
- `warn`: Cache operations, timeout warnings
- `error`: Request failures, Redis errors

Example:

```
✅ Configuration validated successfully
Connected to Redis
🚀 Proxy server running on port 9000
📊 Metrics available at http://localhost:9000/metrics
💚 Health check at http://localhost:9000/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC - See LICENSE file for details

## 🙋 Support

For issues, feature requests, or questions:

- Create an [GitHub Issue](https://github.com/sampremm/node-caching-proxy/issues)
- Check [IMPROVEMENTS.md](IMPROVEMENTS.md) for recent enhancements

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Express.js Guide](https://expressjs.com/)
- [LRU Cache Documentation](https://github.com/isaacs/node-lru-cache)

---

**Built with ❤️ for performance and reliability**
