# Observability

Faramesh provides comprehensive observability through Prometheus metrics, structured logging, and event timelines.

## Prometheus Metrics

Faramesh exposes Prometheus metrics at the `/metrics` endpoint.

### Accessing Metrics

```bash
# Get metrics
curl http://127.0.0.1:8000/metrics
```

### Metrics Endpoint

**Endpoint:** `GET /metrics`

**Response:** Prometheus text format

**Example:**
```
# HELP faramesh_requests_total Total number of requests
# TYPE faramesh_requests_total counter
faramesh_requests_total{endpoint="/v1/actions",method="POST",status="200"} 42.0

# HELP faramesh_actions_total Total number of actions
# TYPE faramesh_actions_total counter
faramesh_actions_total{status="allowed",tool="shell"} 10.0
```

---

## Available Metrics

### `faramesh_requests_total`

Total number of HTTP requests to the API.

**Type:** Counter

**Labels:**
- `method` - HTTP method (GET, POST, etc.)
- `endpoint` - API endpoint path
- `status` - HTTP status code

**Example:**
```
faramesh_requests_total{endpoint="/v1/actions",method="POST",status="200"} 42.0
faramesh_requests_total{endpoint="/v1/actions/{id}",method="GET",status="404"} 3.0
```

**Use Cases:**
- Request rate monitoring
- Endpoint popularity analysis
- Error rate tracking

---

### `faramesh_errors_total`

Total number of errors by error type.

**Type:** Counter

**Labels:**
- `error_type` - Error type (ValidationError, ActionNotFoundError, etc.)

**Example:**
```
faramesh_errors_total{error_type="ValidationError"} 5.0
faramesh_errors_total{error_type="ActionNotFoundError"} 2.0
```

**Use Cases:**
- Error rate monitoring
- Error type distribution
- Alerting on error spikes

---

### `faramesh_actions_total`

Total number of actions by status and tool.

**Type:** Counter

**Labels:**
- `status` - Action status (allowed, denied, pending_approval, etc.)
- `tool` - Tool name (shell, http, stripe, etc.)

**Example:**
```
faramesh_actions_total{status="allowed",tool="shell"} 10.0
faramesh_actions_total{status="pending_approval",tool="stripe"} 3.0
faramesh_actions_total{status="denied",tool="http"} 2.0
```

**Use Cases:**
- Action throughput monitoring
- Tool usage statistics
- Approval rate tracking
- Denial rate monitoring

---

### `faramesh_action_duration_seconds`

Action processing duration histogram (time from submission to decision).

**Type:** Histogram

**Labels:**
- `tool` - Tool name
- `operation` - Operation name

**Buckets:** Default Prometheus histogram buckets (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10)

**Example:**
```
faramesh_action_duration_seconds_bucket{operation="run",tool="shell",le="0.005"} 5.0
faramesh_action_duration_seconds_bucket{operation="run",tool="shell",le="0.01"} 10.0
faramesh_action_duration_seconds_sum{operation="run",tool="shell"} 0.5
faramesh_action_duration_seconds_count{operation="run",tool="shell"} 20.0
```

**Use Cases:**
- Policy evaluation performance
- P50/P95/P99 latency tracking
- Performance regression detection

---

## Prometheus Setup

### Scraping Metrics

Add Faramesh to your Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'faramesh'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

### Service Discovery

For Kubernetes, use service discovery:

```yaml
scrape_configs:
  - job_name: 'faramesh'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: faramesh
        action: keep
```

---

## Grafana Dashboards

### Example Queries

**Request Rate:**
```promql
rate(faramesh_requests_total[5m])
```

**Error Rate:**
```promql
rate(faramesh_errors_total[5m])
```

**Action Throughput:**
```promql
rate(faramesh_actions_total[5m])
```

**Approval Rate:**
```promql
rate(faramesh_actions_total{status="pending_approval"}[5m]) / 
rate(faramesh_actions_total[5m])
```

**P95 Latency:**
```promql
histogram_quantile(0.95, rate(faramesh_action_duration_seconds_bucket[5m]))
```

**Tool Distribution:**
```promql
sum by (tool) (faramesh_actions_total)
```

**Status Distribution:**
```promql
sum by (status) (faramesh_actions_total)
```

### Dashboard Panels

**Recommended Panels:**

1. **Request Rate** - Line graph showing requests per second
2. **Error Rate** - Line graph showing errors per second by type
3. **Action Throughput** - Line graph showing actions per second
4. **Status Distribution** - Pie chart or bar chart of action statuses
5. **Tool Distribution** - Bar chart of tool usage
6. **Latency (P50/P95/P99)** - Line graph of latency percentiles
7. **Approval Rate** - Gauge showing percentage of actions requiring approval

---

## Logging

Faramesh uses structured logging for observability.

### Log Levels

- `CRITICAL` - Critical errors that may cause service failure
- `ERROR` - Error conditions
- `WARNING` - Warning conditions
- `INFO` - Informational messages (default)
- `DEBUG` - Debug messages
- `TRACE` - Very detailed trace messages

### Setting Log Level

**Command Line:**
```bash
faramesh serve --log-level debug
```

**Environment Variable:**
```bash
export FARAMESH_LOG_LEVEL=debug
faramesh serve
```

### Log Format

Logs include:
- Timestamp
- Log level
- Module/component
- Message
- Context (action ID, error details, etc.)

**Example:**
```
2026-01-13 10:30:45 INFO faramesh.server.main Action created: 2755d4a8-1000-47e6-873c-b9fd535234ad
2026-01-13 10:30:46 WARNING faramesh.server.policy_engine Policy reload failed: Invalid YAML syntax
```

---

## Event Timeline

Every action has a complete event timeline that provides an audit trail.

### Accessing Events

**CLI:**
```bash
faramesh events <action-id>
```

**API:**
```bash
curl http://127.0.0.1:8000/v1/actions/{id}/events
```

**Response:**
```json
[
  {
    "id": "uuid",
    "action_id": "uuid",
    "event_type": "created",
    "meta": {},
    "created_at": "2026-01-13T10:30:45Z"
  },
  {
    "id": "uuid",
    "action_id": "uuid",
    "event_type": "decision_made",
    "meta": {"decision": "require_approval", "reason": "Shell commands require approval"},
    "created_at": "2026-01-13T10:30:45Z"
  }
]
```

### Event Types

- `created` - Action was created
- `decision_made` - Policy evaluation completed
- `approved` - Human approved the action
- `denied` - Human denied the action
- `started` - Execution began
- `succeeded` - Execution completed successfully
- `failed` - Execution failed

### Use Cases

- **Audit Trails:** Complete history of every action
- **Debugging:** Understand why actions were allowed/denied
- **Compliance:** Demonstrate governance and approval processes
- **Analytics:** Analyze approval patterns and decision times

---

## Health Checks

Faramesh provides health check endpoints for monitoring.

### Liveness Probe

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy"
}
```

**Use Case:** Kubernetes liveness probe - indicates process is running

### Readiness Probe

**Endpoint:** `GET /ready`

**Response:**
```json
{
  "status": "ready"
}
```

**Use Case:** Kubernetes readiness probe - indicates service is ready to accept requests

### Kubernetes Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Alerting

### Recommended Alerts

**High Error Rate:**
```promql
rate(faramesh_errors_total[5m]) > 10
```

**High Denial Rate:**
```promql
rate(faramesh_actions_total{status="denied"}[5m]) / 
rate(faramesh_actions_total[5m]) > 0.5
```

**High Latency:**
```promql
histogram_quantile(0.95, rate(faramesh_action_duration_seconds_bucket[5m])) > 1
```

**Service Down:**
```promql
up{job="faramesh"} == 0
```

---

## Best Practices

### 1. Monitor Key Metrics

- Request rate and error rate
- Action throughput and status distribution
- Approval rates and denial rates
- Latency percentiles

### 2. Set Up Alerting

- Alert on high error rates
- Alert on service unavailability
- Alert on unusual patterns (e.g., sudden spike in denials)

### 3. Use Event Timelines for Debugging

- Check event timelines when debugging action issues
- Use events to understand approval workflows
- Export events for compliance/audit purposes

### 4. Regular Dashboard Reviews

- Review dashboards regularly to understand usage patterns
- Identify performance bottlenecks
- Track approval rates and optimize policies

---

## See Also

- [API Reference](API.md) - API endpoints including `/metrics`
- [CLI Reference](CLI.md) - Command-line interface
- [Error Handling](ERROR-HANDLING.md) - Error codes and handling
- [Troubleshooting](Troubleshooting.md) - Common issues and fixes
