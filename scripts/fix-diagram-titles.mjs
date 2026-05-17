#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'docs');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.md')) {
      let s = fs.readFileSync(full, 'utf8');
      const next = s.replace(
        /```text title="Output"\n([\s\S]*?)\n```/g,
        (block, body) => {
          if (body.includes('┌') || body.includes('──') || body.includes('►')) {
            const title = body.includes('Identity check') ? 'Decision pipeline' : 'Diagram';
            return `\`\`\`text title="${title}"\n${body}\n\`\`\``;
          }
          return block;
        },
      );
      if (next !== s) {
        fs.writeFileSync(full, next);
        console.log('fixed', path.relative(root, full));
      }
    }
  }
}

walk(root);
