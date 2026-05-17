# Faramesh Docs

Source for [docs.faramesh.dev](https://docs.faramesh.dev), the documentation for [Faramesh](https://github.com/faramesh/faramesh-core).

You do not need to run the site locally to contribute. Open a pull request with your Markdown changes; when it merges to `main`, the site updates automatically.

## Add or edit a page

1. **Create or edit a file** under `content/docs/`. Use `.md` and mirror the URL path in the folder structure:
   - `content/docs/quickstart.md` → `/quickstart`
   - `content/docs/concepts/identity.md` → `/concepts/identity`
   - `content/docs/frameworks/langgraph.md` → `/frameworks/langgraph`

2. **Add frontmatter** at the top of every page:

   ```yaml
   ---
   title: Page title
   description: One sentence shown in search and previews.
   ---
   ```

3. **Register the page in the sidebar** by adding its path (no `.md`) to `content/docs/meta.json` in the right section:

   ```json
   "---CONCEPTS---",
   "concepts/your-new-page"
   ```

   Use `---SECTION NAME---` lines as separators between groups (see the existing file for examples).

4. **Open a PR** against `main` on [faramesh/faramesh-docs](https://github.com/faramesh/faramesh-docs). Describe what you changed and link any related issues.

## Writing tips

- Use `##` headings for structure; numbered headings like `## 1. Step name` render as step lists on guide pages.
- Fence code with a language tag. Add an optional file label: ` ```bash title="Terminal" ` or ` ```hcl title="governance.fms" `.
- Callouts use this syntax:

   ````markdown
   :::tip[Optional title]
   Short note for the reader.
   :::
   ````

   Types: `info`, `tip`, `note`, `warn`, `danger`.

- Link other docs with root paths: `[Quickstart](/quickstart/)`, not relative file paths.

## Preview locally (optional)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production build: `npm run build` (output in `out/`).

## Repo layout

| Path | Purpose |
|------|---------|
| `content/docs/` | All documentation pages (Markdown) |
| `content/docs/meta.json` | Sidebar order and section labels |
| `app/(home)/page.tsx` | Homepage (edit only for landing layout changes) |
| `public/` | Static assets (favicon, logos) |

Questions or larger doc plans: open an issue or discussion on the repo before a big restructure.
