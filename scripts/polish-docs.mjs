#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'docs');

const CODE_TITLE_DEFAULTS = {
  bash: 'Terminal',
  sh: 'Terminal',
  shell: 'Terminal',
  python: 'agent.py',
  typescript: 'index.ts',
  ts: 'index.ts',
  javascript: 'index.js',
  js: 'index.js',
  json: 'response.json',
  yaml: 'config.yaml',
  yml: 'config.yaml',
  hcl: 'governance.fms',
  toml: 'faramesh.toml',
  text: 'Output',
};

function polishProse(text) {
  let s = text;
  s = s.replace(/\s+—\s+/g, (match, offset, str) => {
    const next = str.slice(offset + match.length, offset + match.length + 1);
    if (next === next.toUpperCase() && /[A-Z]/.test(next)) return '. ';
    return ', ';
  });
  s = s.replace(/\]\(([^)]+)\)\s+—\s+/g, ']($1): ');
  s = s.replace(/\]\(([^)]+)\),\s+/g, ']($1): ');
  s = s.replace(/\s—\s/g, ', ');
  s = s.replace(/,\s+,/g, ',');
  s = s.replace(/\.\s+\./g, '.');
  s = s.replace(/,\s+\./g, '.');
  return s;
}

function addCodeBlockTitles(content) {
  return content.replace(/```([a-zA-Z0-9_-]+)([^\n]*)\n/g, (full, lang, meta) => {
    if (/title\s*=/.test(meta)) return full;
    const normalized = lang.toLowerCase();
    const title = CODE_TITLE_DEFAULTS[normalized];
    if (!title) return full;
    return `\`\`\`${lang} title="${title}"\n`;
  });
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const parts = original.split(/(```[\s\S]*?```)/g);
  const processed = parts
    .map((part, index) => (index % 2 === 1 ? part : polishProse(part)))
    .join('');
  const withTitles = addCodeBlockTitles(processed);

  if (withTitles !== original) {
    fs.writeFileSync(filePath, withTitles);
    return true;
  }
  return false;
}

function walk(dir) {
  let changed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) changed += walk(full);
    else if (entry.name.endsWith('.md') && processFile(full)) {
      console.log('polished', path.relative(root, full));
      changed += 1;
    }
  }
  return changed;
}

console.log(`Done. Updated ${walk(root)} files.`);
