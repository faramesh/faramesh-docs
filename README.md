<<<<<<< HEAD
# Faramesh Docs

Documentation site for Faramesh.

## Project Structure

# Faramesh Docs

Documentation site for [Faramesh Core](https://github.com/faramesh/faramesh-core).

This repo uses Astro + Starlight and keeps the authored docs in `src/content/docs/`.

## Project Structure

```text
.
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   │   └── docs/
│   ├── lib/
│   └── styles/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Local Commands

Run commands from the repo root:

```bash
npm install
npm run dev
npm run build
npm run preview
```

## How To Edit Docs

If you want to change an existing page:

1. Edit the file under `src/content/docs/`.
2. Update `src/lib/docs-nav.js` if the page should appear in the sidebar.
3. Run `npm run build`.
4. Open a pull request with the change.

## How To Add A Single Page

1. Create a new `.md` or `.mdx` file under `src/content/docs/`.
2. Add frontmatter with `title` and `description`.
3. Write the page content.
4. Add the new slug to `src/lib/docs-nav.js` if it should appear in the nav.
5. Run `npm run build`.
6. Submit the change in a pull request.

Example:

```md
---
title: Example Page
description: Short summary of the page.
---

# Example Page

Your content goes here.
```

## How To Add Multiple Pages

1. Create one file per page inside the correct docs folder.
2. Keep filenames and slugs consistent with the sidebar section you want.
3. Add every new slug to `src/lib/docs-nav.js`.
4. Rebuild locally and confirm each route renders.
5. Open a single pull request for the full doc set.

## Pull Request Workflow

Use a PR for every docs edit so changes stay reviewable.

1. Create a branch.
2. Make the docs edits.
3. Run `npm run build`.
4. Open a pull request.
5. Include a short summary of the pages you added or changed.

## Checklist Before Sending A PR

- The page has valid frontmatter.
- The page appears in the correct sidebar section if needed.
- The build completes without errors.
- New routes render with the expected heading.

## Reference

- `src/lib/docs-nav.js` controls sidebar sections and page placement.
- `src/content/docs/` contains all authored docs pages.
- `src/components/` contains the custom site chrome.


### Reference
| File | What's in it |
|---|---|
| [API.md](reference/API.md) | Full HTTP API reference |
| [CLI.md](reference/CLI.md) | All CLI commands |
| [EXECUTION-GATE.md](reference/EXECUTION-GATE.md) | How the gate works, deterministic hashing, audit chain |
| [Policies.md](reference/Policies.md) | Policy syntax, rules, first-match-wins |
| [POLICY_PACKS.md](reference/POLICY_PACKS.md) | Ready-to-use policy templates |

### SDKs
| File | What's in it |
|---|---|
| [SDK-Python.md](sdk/SDK-Python.md) | Python SDK (`faramesh-sdk`) |
| [SDK-Node.md](sdk/SDK-Node.md) | Node.js SDK (`@faramesh/sdk`) |

### Platform & Operations
| File | What's in it |
|---|---|
| [Docker.md](platform/Docker.md) | Docker Compose setup |
| [OBSERVABILITY.md](platform/OBSERVABILITY.md) | Prometheus metrics, monitoring |
| [UI.md](platform/UI.md) | Dashboard and web UI |

### Security & Troubleshooting
| File | What's in it |
|---|---|
| [SECURITY-GUARDRAILS.md](security/SECURITY-GUARDRAILS.md) | Security model |
| [ERROR-HANDLING.md](security/ERROR-HANDLING.md) | Error types and handling |
| [Troubleshooting.md](community/Troubleshooting.md) | Common issues |

## Related repos

| Repo | Purpose |
|---|---|
| [faramesh-core](https://github.com/faramesh/faramesh-core) | The server + policy engine |
| [faramesh-examples](https://github.com/faramesh/faramesh-examples) | Runnable examples |
| [faramesh-python-sdk](https://github.com/faramesh/faramesh-python-sdk) | Python SDK |
| [faramesh-node-sdk](https://github.com/faramesh/faramesh-node-sdk) | Node.js SDK |
>>>>>>> origin/main
