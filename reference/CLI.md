# Faramesh CLI Reference

Complete reference for the Faramesh command-line interface. The CLI provides a powerful interface for managing actions, policies, and the server.

## Installation

```bash
# Install from PyPI
pip install faramesh

# Or install from source with CLI enhancements
pip install -e ".[cli]"
```

**Note:** If the `faramesh` command is not found after installation, use:
```bash
python3 -m faramesh.cli <command>
```

## Global Options

These options can be used with any command:

| Option | Description | Default |
|--------|-------------|---------|
| `--host HOST` | API host | `127.0.0.1` |
| `--port PORT` | API port | `8000` |
| `--token TOKEN` | Auth token (overrides `FARAMESH_TOKEN` env var) | - |
| `--json` | Output as JSON (where supported) | - |
| `-h, --help` | Show help message | - |

**Example:**
```bash
faramesh --host localhost --port 9000 --token my-token list --json
```

## Action Management Commands

### `list`

List recent actions with status, risk level, and metadata.

**Usage:**
```bash
faramesh list [OPTIONS]
```

**Options:**
- `--limit N` - Maximum number of actions to show (default: 20)
- `--full` - Show full UUIDs instead of truncated IDs
- `--json` - Output as JSON

**Examples:**
```bash
# List recent actions
faramesh list

# List with full UUIDs
faramesh list --full

# List first 50 actions as JSON
faramesh list --limit 50 --json

# List with custom host/port
faramesh --host 0.0.0.0 --port 9000 list
```

**Output:**
- Color-coded table with status, risk level, tool, operation, params, and created timestamp
- Status colors: green (allowed/approved/succeeded), yellow (pending_approval), red (denied/failed), blue (executing)
- Risk colors: green (low), yellow (medium), red (high)

**Exit Codes:**
- `0` - Success
- `1` - Error (connection error, HTTP error, etc.)

---

### `get`

Get detailed information about a specific action.

**Usage:**
```bash
faramesh get <id> [OPTIONS]
```

**Arguments:**
- `id` - Action ID (supports prefix matching - use first 8+ characters)

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
# Get action by full UUID
faramesh get 2755d4a8-1000-47e6-873c-b9fd535234ad

# Get action by prefix (first 8 characters)
faramesh get 2755d4a8

# Get as JSON
faramesh get 2755d4a8 --json
```

**Output:**
- Full action details including all fields, status, decision, risk level, events, etc.

**Exit Codes:**
- `0` - Success
- `1` - Error (action not found, connection error, etc.)

**Prefix Matching:**
If multiple actions match the prefix, Faramesh will warn you and list all matches. Use a longer prefix or the full UUID to disambiguate.

---

### `approve`

Approve a pending-approval action.

**Usage:**
```bash
faramesh approve <id> [OPTIONS]
```

**Arguments:**
- `id` - Action ID (supports prefix matching)

**Options:**
- `--reason REASON` - Optional reason for approval
- `--json` - Output as JSON

**Examples:**
```bash
# Approve action
faramesh approve 2755d4a8

# Approve with reason
faramesh approve 2755d4a8 --reason "Looks safe, approved"

# Approve as JSON
faramesh approve 2755d4a8 --json
```

**Exit Codes:**
- `0` - Success
- `1` - Error (action not found, not in pending_approval status, invalid token, etc.)

---

### `deny`

Deny a pending-approval action.

**Usage:**
```bash
faramesh deny <id> [OPTIONS]
```

**Arguments:**
- `id` - Action ID (supports prefix matching)

**Options:**
- `--reason REASON` - Optional reason for denial
- `--json` - Output as JSON

**Examples:**
```bash
# Deny action
faramesh deny 2755d4a8

# Deny with reason
faramesh deny 2755d4a8 --reason "Too risky, denied"

# Deny as JSON
faramesh deny 2755d4a8 --json
```

**Exit Codes:**
- `0` - Success
- `1` - Error (action not found, not in pending_approval status, invalid token, etc.)

---

### `allow`

Alias for `approve`. Same usage and options.

**Usage:**
```bash
faramesh allow <id> [OPTIONS]
```

---

### `events`

Show the complete event timeline for an action.

**Usage:**
```bash
faramesh events <id> [OPTIONS]
```

**Arguments:**
- `id` - Action ID (supports prefix matching)

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
# Show event timeline
faramesh events 2755d4a8

# Show as JSON
faramesh events 2755d4a8 --json
```

**Output:**
- Table or JSON array of events with timestamps, event types, and metadata
- Event types: `created`, `decision_made`, `approved`, `denied`, `started`, `succeeded`, `failed`

**Exit Codes:**
- `0` - Success
- `1` - Error (action not found, connection error, etc.)

---

### `logs`

Show status transitions for an action (similar to `events` but focused on status changes).

**Usage:**
```bash
faramesh logs <id> [OPTIONS]
```

**Arguments:**
- `id` - Action ID

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
faramesh logs 2755d4a8
faramesh logs 2755d4a8 --json
```

**Exit Codes:**
- `0` - Success
- `1` - Error

---

### `tail`

Stream live actions via Server-Sent Events (SSE), similar to `kubectl logs -f`.

**Usage:**
```bash
faramesh tail
```

**Examples:**
```bash
# Stream live actions
faramesh tail

# Stream with custom host/port
faramesh --host localhost --port 9000 tail
```

**Output:**
- Real-time stream of new actions as they are created
- Press `CTRL+C` to stop

**Exit Codes:**
- `0` - Success (interrupted with CTRL+C)
- `1` - Error (connection error, etc.)

---

### `curl`

Print ready-to-copy curl commands for an action (approve, deny, get, etc.).

**Usage:**
```bash
faramesh curl <id>
```

**Arguments:**
- `id` - Action ID (supports prefix matching)

**Examples:**
```bash
faramesh curl 2755d4a8
```

**Output:**
- Ready-to-copy curl commands for common operations (approve, deny, get)

**Exit Codes:**
- `0` - Success
- `1` - Error (action not found, etc.)

---

### `replay`

Replay an allowed or approved action (create a new action with the same parameters).

**Usage:**
```bash
faramesh replay <id> [OPTIONS]
```

**Arguments:**
- `id` - Action ID (supports prefix matching)

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
faramesh replay 2755d4a8
faramesh replay 2755d4a8 --json
```

**Exit Codes:**
- `0` - Success
- `1` - Error (action not found, cannot replay, etc.)

---

## Server Management Commands

### `serve`

Start the Faramesh server.

**Usage:**
```bash
faramesh serve [OPTIONS]
```

**Options:**
- `--host HOST` - Host to bind to (default: `127.0.0.1`)
- `--port PORT` - Port to bind to (default: `8000`)
- `--reload` - Enable auto-reload (development mode, reloads Python code on changes)
- `--hot-reload` - Hot reload policy file when modified (local files only)
- `--watch` - Deprecated alias for `--hot-reload`
- `--log-level LEVEL` - Log level: `critical`, `error`, `warning`, `info`, `debug`, `trace` (default: `info`)

**Examples:**
```bash
# Start server
faramesh serve

# Start with policy hot reload
faramesh serve --hot-reload

# Start on custom host/port
faramesh serve --host 0.0.0.0 --port 9000

# Start with debug logging
faramesh serve --log-level debug

# Start with code auto-reload (development)
faramesh serve --reload
```

**Environment Variables:**
- `FARAMESH_HOST` - Overrides `--host`
- `FARAMESH_PORT` - Overrides `--port`
- `FARAMESH_HOT_RELOAD=1` - Enables hot reload (same as `--hot-reload`)

**Exit Codes:**
- `0` - Success (interrupted with CTRL+C)
- `1` - Error (port in use, missing dependencies, etc.)

**Note:** Press `CTRL+C` to stop the server.

---

### `migrate`

Run database migrations (creates/updates database schema).

**Usage:**
```bash
faramesh migrate
```

**Examples:**
```bash
# Run migrations
faramesh migrate

# For PostgreSQL, ensure FARA_DB_BACKEND=postgres and FARA_POSTGRES_DSN are set
FARA_DB_BACKEND=postgres FARA_POSTGRES_DSN=postgresql://... faramesh migrate
```

**Exit Codes:**
- `0` - Success
- `1` - Error (database connection error, migration failure, etc.)

---

## Policy Management Commands

### `policy validate`

Validate a policy file for syntax errors.

**Usage:**
```bash
faramesh policy validate <file>
# or
faramesh policy-validate <file>
```

**Arguments:**
- `file` - Path to policy YAML file

**Examples:**
```bash
faramesh policy validate policies/default.yaml
faramesh policy-validate policies/custom.yaml
```

**Exit Codes:**
- `0` - Policy is valid
- `1` - Policy has errors

---

### `policy test`

Test an action (from JSON file) against a policy.

**Usage:**
```bash
faramesh policy test <file> [OPTIONS]
# or
faramesh policy-test <file> [OPTIONS]
```

**Arguments:**
- `file` - Path to JSON file with action definition

**Options:**
- `--json` - Output as JSON

**JSON File Format:**
```json
{
  "tool": "shell",
  "operation": "run",
  "params": {"cmd": "echo hello"},
  "context": {"agent_id": "test-agent"}
}
```

**Examples:**
```bash
# Test action against active policy
faramesh policy test examples/http_action.json

# Test as JSON
faramesh policy-test examples/http_action.json --json
```

**Exit Codes:**
- `0` - Success
- `1` - Error (file not found, invalid JSON, etc.)

---

### `policy refresh`

Refresh the policy cache (reload policy from file).

**Usage:**
```bash
faramesh policy refresh
# or
faramesh policy-refresh
```

**Examples:**
```bash
faramesh policy refresh
faramesh policy-refresh
```

**Exit Codes:**
- `0` - Success
- `1` - Error (policy file not found, invalid policy, etc.)

---

### `policy new`

Scaffold a new policy file.

**Usage:**
```bash
faramesh policy new <name>
# or
faramesh policy-new <name>
```

**Arguments:**
- `name` - Policy name (without `.yaml` extension)

**Examples:**
```bash
faramesh policy new custom
# Creates policies/custom.yaml

faramesh policy-new production
# Creates policies/production.yaml
```

**Exit Codes:**
- `0` - Success
- `1` - Error (file already exists, cannot write, etc.)

---

### `policy diff`

Show differences between two policy files.

**Usage:**
```bash
faramesh policy diff <old_file> <new_file>
# or
faramesh policy-diff <old_file> <new_file>
```

**Arguments:**
- `old_file` - Path to old policy file
- `new_file` - Path to new policy file

**Examples:**
```bash
faramesh policy diff policies/old.yaml policies/new.yaml
faramesh policy-diff policies/default.yaml policies/custom.yaml
```

**Output:**
- Summary of differences: added rules, removed rules, modified rules

**Exit Codes:**
- `0` - Success
- `1` - Error (file not found, etc.)

---

## Developer Experience (DX) Commands

### `init`

Scaffold a working starter layout (creates `policies/` directory, `policies/default.yaml`, `.env.example`).

**Usage:**
```bash
faramesh init [OPTIONS]
```

**Options:**
- `--force` - Overwrite existing files

**Examples:**
```bash
# Initialize project
faramesh init

# Force overwrite existing files
faramesh init --force
```

**Creates:**
- `policies/` directory
- `policies/default.yaml` with default deny rule
- `.env.example` with environment variable templates

**Exit Codes:**
- `0` - Success
- `1` - Error (cannot create files, etc.)

---

### `explain`

Explain why an action was allowed, denied, or required approval.

**Usage:**
```bash
faramesh explain <id>
```

**Arguments:**
- `id` - Action ID (supports prefix matching)

**Examples:**
```bash
faramesh explain 2755d4a8
```

**Output:**
- Policy decision explanation including:
  - Status and decision
  - Reason from matching policy rule
  - Risk level
  - Policy file and version
  - Tool, operation, and params

**Exit Codes:**
- `0` - Success
- `1` - Error (action not found, etc.)

---

### `doctor`

Sanity check user environment (checks Python version, database, policy file, auth token, UI assets).

**Usage:**
```bash
faramesh doctor
```

**Examples:**
```bash
faramesh doctor
```

**Output:**
- Checklist of environment components:
  - ✓ Python version
  - ✓ Database exists and is writable
  - ✓ Policy file exists
  - ✓ Auth token configured (if applicable)
  - ✓ UI assets found

**Exit Codes:**
- `0` - All checks passed
- `1` - Some checks failed

---

### `build-ui`

Build the web UI (compiles React/TypeScript frontend).

**Usage:**
```bash
faramesh build-ui
```

**Examples:**
```bash
faramesh build-ui
```

**Requirements:**
- Node.js 18+ installed
- `web/` directory with `package.json`
- Run `npm install` in `web/` directory first (if needed)

**Exit Codes:**
- `0` - Success
- `1` - Error (Node.js not found, build failed, etc.)

---

### `init-docker`

Generate Docker configuration files (`Dockerfile`, `docker-compose.yaml`, etc.).

**Usage:**
```bash
faramesh init-docker [OPTIONS]
```

**Options:**
- `--force` - Overwrite existing files

**Examples:**
```bash
faramesh init-docker
faramesh init-docker --force
```

**Creates:**
- `Dockerfile`
- `docker-compose.yaml`
- `.dockerignore` (if not exists)

**Exit Codes:**
- `0` - Success
- `1` - Error (cannot create files, etc.)

---

## Action Namespace Commands

### `action submit`

Submit a new action via CLI.

**Usage:**
```bash
faramesh action submit <agent> <tool> <operation> [OPTIONS]
```

**Arguments:**
- `agent` - Agent ID
- `tool` - Tool name
- `operation` - Operation name

**Options:**
- `--param KEY=VALUE` - Parameter (can be used multiple times)
- `--context KEY=VALUE` - Context (can be used multiple times)
- `--json` - Output as JSON

**Examples:**
```bash
# Submit action
faramesh action submit my-agent shell run --param cmd="echo hello"

# Submit with multiple params
faramesh action submit my-agent http get \
  --param url="https://example.com" \
  --param method=GET \
  --context user=alice
```

**Exit Codes:**
- `0` - Success
- `1` - Error (validation error, connection error, etc.)

---

### `action approve`, `action deny`, `action start`, `action replay`

Same as top-level commands but under the `action` namespace. See above for usage.

---

## Other Commands

### `history`

Alias for `list`. Shows action history.

**Usage:**
```bash
faramesh history [OPTIONS]
```

**Options:**
- `--limit N` - Number of actions to show (default: 20)
- `--full` - Show full UUIDs
- `--json` - Output as JSON

---

### `apply`

Submit action from YAML/JSON file.

**Usage:**
```bash
faramesh apply <file> [OPTIONS]
```

**Arguments:**
- `file` - Path to action YAML/JSON file

**Options:**
- `--json` - Output as JSON

**Examples:**
```bash
faramesh apply examples/file_apply.yaml
faramesh apply action.json --json
```

---

### `shell`

Start interactive REPL shell for interactive Faramesh operations.

**Usage:**
```bash
faramesh shell
```

**Examples:**
```bash
faramesh shell
```

---

### `token create`, `token list`, `token revoke`

Token management commands (if implemented).

**Usage:**
```bash
faramesh token create <name> [--ttl TTL]
faramesh token list [--json]
faramesh token revoke <id>
```

---

## Prefix Matching

Many commands that take an action ID support **prefix matching**. You can use the first 8+ characters of a UUID instead of the full UUID:

```bash
# These are equivalent:
faramesh get 2755d4a8
faramesh get 2755d4a8-1000-47e6-873c-b9fd535234ad
```

**Note:** If multiple actions match the prefix, Faramesh will warn you and list all matches. Use a longer prefix or the full UUID to disambiguate.

---

## Exit Codes

All commands follow standard Unix exit codes:

- `0` - Success
- `1` - General error (connection error, HTTP error, validation error, etc.)
- `130` - Interrupted (CTRL+C)

---

## Environment Variables

The CLI respects the following environment variables (in addition to global options):

- `FARAMESH_HOST` - API host (overrides `--host`)
- `FARAMESH_PORT` - API port (overrides `--port`)
- `FARAMESH_TOKEN` - Auth token (overrides `--token`)
- `FARAMESH_BASE_URL` - Full API base URL (overrides host/port)
- `FARA_API_HOST`, `FARA_API_PORT`, `FARA_AUTH_TOKEN`, `FARA_API_BASE` - Legacy variables (still supported)

---

## Output Formats

### Table Output (Default)

When `--json` is not used, commands output formatted tables with:
- Color-coded status and risk levels
- Truncated UUIDs (use `--full` for full UUIDs)
- Formatted timestamps
- Readable parameter display

**Requirements:** Optional dependencies (`rich` or `tabulate`) provide enhanced formatting. Without them, plain text tables are used.

### JSON Output

Use `--json` flag for machine-readable JSON output:

```bash
faramesh list --json
faramesh get 2755d4a8 --json
```

---

## Troubleshooting

### Command Not Found

If `faramesh` command is not found:
```bash
# Use Python module syntax
python3 -m faramesh.cli <command>

# Or ensure pip install added to PATH
pip install -e .
```

### Connection Errors

If you see connection errors:
1. Ensure server is running: `faramesh serve`
2. Check host/port: `faramesh --host localhost --port 8000 list`
3. Check firewall/network settings

### Authentication Errors

If you see authentication errors:
1. Set `FARAMESH_TOKEN` environment variable
2. Or use `--token` flag: `faramesh --token my-token list`
3. Ensure server has the same token configured

---

## See Also

- [API Reference](API.md) - REST API endpoints
- [Quick Start](../QUICKSTART.md) - Getting started guide
- [Policy Configuration](POLICIES.md) - Policy file format
- [Troubleshooting](Troubleshooting.md) - Common issues and fixes
