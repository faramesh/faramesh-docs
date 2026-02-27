# Policy Hot Reload

Faramesh supports hot reloading of policy files, allowing you to update policies without restarting the server.

## Overview

When hot reload is enabled, Faramesh monitors the policy file for changes and automatically reloads it when changes are detected. This is particularly useful during development and policy testing.

## Enabling Hot Reload

### Command Line Flag

Start the server with the `--hot-reload` flag:

```bash
faramesh serve --hot-reload
```

### Environment Variable

Set the `FARAMESH_HOT_RELOAD` environment variable:

```bash
FARAMESH_HOT_RELOAD=1 faramesh serve
```

### Deprecated Flag

The `--watch` flag is deprecated but still supported for backward compatibility. Use `--hot-reload` instead.

## How It Works

1. **File Monitoring**: When hot reload is enabled, Faramesh uses the `watchdog` library to monitor the policy file for changes.

2. **Automatic Reload**: When a change is detected:
   - The policy file is parsed and validated
   - If valid, the new policy replaces the current one
   - A success message is logged with a timestamp
   - If invalid, the previous valid policy remains active

3. **Failure Safety**: If policy reload fails (e.g., invalid YAML syntax), the server:
   - Logs an error message
   - Keeps the previous valid policy active
   - Continues serving requests without interruption

## Requirements

### Local Policy Files Only

Hot reload only works for **local policy files**. It does not work for:
- Remote policy files (HTTP/HTTPS URLs)
- Policy files loaded via tokens or other remote mechanisms

If you attempt to enable hot reload with a non-local policy file, Faramesh will log a warning and continue without hot reload.

### Optional Dependency

Hot reload requires the `watchdog` library. If it's not installed, Faramesh will:
- Log a warning
- Fall back to manual policy refresh (use `faramesh policy-refresh` command)
- Continue serving requests normally

**Install watchdog:**
```bash
pip install watchdog
```

Or install with CLI enhancements:
```bash
pip install -e ".[cli]"
```

## Usage Examples

### Development Workflow

```bash
# Terminal 1: Start server with hot reload
faramesh serve --hot-reload

# Terminal 2: Edit policy file
vim policies/default.yaml

# Terminal 1: See automatic reload message
# ✓ Policy reloaded from /path/to/policies/default.yaml at 2026-01-13 10:30:45
```

### Testing Policy Changes

1. Start server with hot reload:
   ```bash
   faramesh serve --hot-reload
   ```

2. Make a test action request:
   ```bash
   curl -X POST http://127.0.0.1:8000/v1/actions \
     -H "Content-Type: application/json" \
     -d '{"agent_id": "test", "tool": "shell", "operation": "run", "params": {"cmd": "echo test"}}'
   ```

3. Edit the policy file to change the rule:
   ```yaml
   rules:
     - match:
         tool: "shell"
         op: "*"
       deny: true  # Changed from allow to deny
   ```

4. Save the file - policy reloads automatically

5. Make the same request again - it should now be denied

### Invalid Policy Handling

If you save an invalid policy file:

```yaml
rules:
  - match:
      tool: "shell"
      op: "*"
    allow: true
  # Missing closing bracket - invalid YAML
```

Faramesh will:
1. Detect the file change
2. Attempt to reload
3. Encounter a YAML parsing error
4. Log: `⚠ Policy reload failed: <error message>`
5. Log: `⚠ Keeping previous valid policy active`
6. Continue serving with the previous valid policy

## Manual Policy Refresh

If hot reload is not enabled or you want to manually refresh the policy:

```bash
faramesh policy-refresh
```

This command:
- Reloads the policy from the configured policy file
- Validates the policy
- Reports success or error

## Best Practices

1. **Use Hot Reload in Development**: Enable hot reload during development and policy testing for faster iteration.

2. **Disable in Production**: For production deployments, consider disabling hot reload and using a deployment process that restarts the server with new policies.

3. **Test Policy Changes**: After making policy changes, test with the playground endpoint (`/playground/eval`) before relying on the changes in production.

4. **Version Control**: Keep policy files in version control and use proper change management processes.

5. **Monitor Logs**: Watch server logs for hot reload messages to confirm policy changes are being applied.

## Troubleshooting

### Hot Reload Not Working

**Check:**
1. Is the policy file local (not a remote URL)?
2. Is `watchdog` installed? (`pip install watchdog`)
3. Are you using the `--hot-reload` flag or `FARAMESH_HOT_RELOAD=1`?
4. Check server logs for warnings

### Policy Not Updating

**Check:**
1. Is the file actually being saved?
2. Are there YAML syntax errors? (Check server logs)
3. Is the previous valid policy still active? (This is expected if reload failed)

### File Permissions

Ensure the server process has read access to the policy file and write access to the directory (for file monitoring).

## See Also

- [Policy Configuration](POLICIES.md) - Policy file format and rules
- [CLI Reference](CLI.md) - Command-line tools including `policy-refresh`
- [Quick Start](../QUICKSTART.md) - Getting started guide
