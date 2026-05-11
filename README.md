# Faramesh Docs

Documentation site for [Faramesh Core](https://github.com/faramesh/faramesh-core).

This repository contains all documentation for Faramesh. Docs are built with Astro + Starlight and automatically deployed to the live site via Netlify/Vercel when PRs merge to `main`.

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

## Contributing: How To Add or Edit Docs

**All documentation changes go via pull request.** Contributors do NOT need to run the development server locally. When your PR merges to `main`, the site automatically deploys to the live site (Netlify/Vercel) with your changes.

### Edit an Existing Page

1. Locate the `.md` or `.mdx` file under `src/content/docs/` that you want to edit.
2. Make your changes in GitHub's web editor or in your local fork.
3. If adding the page to the sidebar for the first time, update `src/lib/docs-nav.js` with the new slug.
4. Open a pull request with a clear description of your changes.
5. Once the PR is merged to `main`, your changes will be live within minutes.

### Add a Single New Page

1. Create a new `.md` or `.mdx` file under `src/content/docs/` in the appropriate section folder.
2. Add frontmatter with `title` and `description`:
   ```md
   ---
   title: My New Page
   description: A brief description of the page.
   ---
   ```
3. Write your page content.
4. If the page should appear in the sidebar navigation, add it to `src/lib/docs-nav.js`.
5. Commit your changes and open a pull request.
6. Once merged, the site will automatically update.

### Add Multiple Pages

1. Create one `.md` or `.mdx` file per page in the appropriate docs folder.
2. Each file must have valid frontmatter (`title` and `description`).
3. Add entries for each new page to `src/lib/docs-nav.js` in the correct section.
4. Open a single pull request for the entire set of changes.
5. Once merged, all pages will be live.

## PR Checklist

Before submitting your PR:

- [ ] Each page has valid frontmatter (`title` and `description`).
- [ ] New pages are added to `src/lib/docs-nav.js` if they should appear in the sidebar.
- [ ] File paths and slugs match the documentation section they belong to.

## File Reference

- **`src/lib/docs-nav.js`** — Controls sidebar sections and page placement.
- **`src/content/docs/`** — All authored documentation pages organized by section.
- **`src/components/`** — Custom site components (header, sidebar, etc.).
- **`astro.config.mjs`** — Astro and Starlight configuration.

## Deployment

Changes are automatically deployed via Netlify/Vercel when PRs merge to `main`. No manual deployment steps are needed; simply merge your PR and the site will update within minutes.
