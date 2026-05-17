# Faramesh Docs

Documentation site for [Faramesh](https://github.com/faramesh/faramesh-core), built with [Fumadocs](https://github.com/fuma-nama/fumadocs).

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start   # serves static export from out/
```

## Content

- **Docs pages:** `content/docs/` (Markdown, same URLs as before: `/quickstart`, `/concepts/...`, etc.)
- **Sidebar tree:** `content/docs/meta.json`
- **Homepage:** `app/(home)/page.tsx` with sections in `components/home/`

## Stack

- Next.js (static export)
- Fumadocs MDX + Fumadocs UI
- Tailwind CSS 4
