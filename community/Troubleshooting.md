## Troubleshooting

Common issues and how to fix them.

### Server won’t start

**Symptoms**

- `faramesh serve` exits immediately.
- Traceback about DB or policy file.

**Checks**

- Ensure `policies/default.yaml` exists (or set `FARA_POLICY_FILE`).
- Ensure `data/` directory is writable.

```bash
ls -l policies/default.yaml
mkdir -p data
```

### Policy validation errors

**Symptoms**

- CLI or logs show “invalid policy” / schema errors.

**Fix**

```bash
faramesh policy-validate policies/default.yaml
```

Address any reported fields or missing keys. See `docs/Policies.md` for the correct structure.

### Hot reload crashes

Hot reload is designed to *never* replace a valid policy with an invalid one.

If `faramesh serve --hot-reload` logs errors:

- Check the path in `FARA_POLICY_FILE` or `settings.policy_file`.
- Fix the YAML and re‑save – the watcher will try again.

### CLI can’t connect

**Symptoms**

- `faramesh list` prints connection errors.

**Checks**

- Is the server running? `curl http://127.0.0.1:8000/health`
- Are you using a non‑default host/port?

```bash
faramesh --host 127.0.0.1 --port 8000 list
```

If you are behind Docker, use the container hostname/port (see `docs/Docker.md`).

### Auth errors

**Symptoms**

- 401 errors from API or CLI when `auth_token` is configured.

**Fix**

- Server side: set `auth_token` (via env or settings).
- Client side: set `FARAMESH_TOKEN` or pass `--token` to CLI / `token` in SDK config.

### Node SDK test failing locally

If `tests/test_sdk.py::test_node_sdk_submit_and_get` fails:

- Make sure Node >= 18 is installed.
- Build the SDK:

```bash
cd sdk/node
npm install
npm run build
```

Then rerun tests:

```bash
cd ../..
python -m pytest tests/test_sdk.py::test_node_sdk_submit_and_get -v
```

### Docker issues

See `docs/Docker.md` for:

- Port conflicts.
- Volume permissions.
- Postgres configuration.

