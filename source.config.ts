import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import {
  remarkDirectiveAdmonition,
  remarkSteps,
} from 'fumadocs-core/mdx-plugins';
import remarkDirective from 'remark-directive';

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: (plugins) => [
      remarkDirective,
      remarkDirectiveAdmonition,
      ...plugins,
      remarkSteps,
    ],
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      langAlias: {
        fpl: 'hcl',
        fms: 'hcl',
      },
    },
  },
});
