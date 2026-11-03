// Markdown → .docx exporter for design docs (pandoc is not available on every dev machine).
// Renders ```mermaid blocks to PNG with mermaid-cli, then builds a Word file with a title page and TOC.
// Usage: node scripts/docs-export.mjs docs/HLD.md docs/LLD.md docs/USER_MANUAL.md   (npm run docs)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import sharp from 'sharp';
import {
  AlignmentType, Document, HeadingLevel, ImageRun, Packer, PageBreak, Paragraph,
  Table, TableCell, TableOfContents, TableRow, TextRun, WidthType, ShadingType,
} from 'docx';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mmdc = resolve(root, 'node_modules/.bin', process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc');

function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return [{}, src];
  const meta = Object.fromEntries(
    m[1].split('\n').map((l) => l.split(/:\s*/, 2)).map(([k, v]) => [k.trim(), v.replace(/^"|"$/g, '')]),
  );
  return [meta, src.slice(m[0].length)];
}

// Inline markdown (bold, italic, code, links) → TextRuns.
function runs(tokens = [], style = {}) {
  return tokens.flatMap((t) => {
    switch (t.type) {
      case 'strong': return runs(t.tokens, { ...style, bold: true });
      case 'em': return runs(t.tokens, { ...style, italics: true });
      case 'codespan': return [new TextRun({ text: t.text, font: 'Consolas', ...style })];
      case 'link': return runs(t.tokens, { ...style, color: '1E5F74', underline: {} });
      case 'br': return [new TextRun({ break: 1 })];
      case 'text': return t.tokens ? runs(t.tokens, style) : [new TextRun({ text: decode(t.text), ...style })];
      default: return [new TextRun({ text: decode(t.raw ?? ''), ...style })];
    }
  });
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function mermaidPng(code, out) {
  const src = out.replace(/\.png$/, '.mmd');
  await writeFile(src, code);
  // .cmd shims need a shell on Windows; the arguments are fixed, internally generated paths.
  // CI / containers: PUPPETEER_EXECUTABLE_PATH points at an installed Chrome; scripts/puppeteer.json adds --no-sandbox.
  execFileSync(mmdc, ['-i', src, '-o', out, '-b', 'white', '-s', '2', '-p', resolve(root, 'scripts/puppeteer.json')], { stdio: 'ignore', shell: process.platform === 'win32' });
  const buf = await readFile(out);
  const { width, height } = await sharp(buf).metadata();
  const w = Math.min(600, width / 2);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({ type: 'png', data: buf, transformation: { width: w, height: (height / width) * w } })],
  });
}

async function convert(file) {
  const [meta, body] = frontMatter((await readFile(file, 'utf8')).replace(/\r\n/g, '\n'));
  const name = basename(file, '.md');
  const diagDir = resolve(dirname(file), 'diagrams');
  await mkdir(diagDir, { recursive: true });
  const children = [];
  let diagram = 0;

  for (const tok of marked.lexer(body)) {
    switch (tok.type) {
      case 'heading':
        children.push(new Paragraph({ heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][Math.min(tok.depth, 3) - 1], children: runs(tok.tokens) }));
        break;
      case 'paragraph':
        children.push(new Paragraph({ children: runs(tok.tokens), spacing: { after: 120 } }));
        break;
      case 'list':
        for (const item of tok.items) {
          const inline = item.tokens.flatMap((t) => (t.type === 'text' || t.type === 'paragraph' ? t.tokens ?? [t] : []));
          children.push(new Paragraph({ bullet: { level: 0 }, children: runs(inline) }));
        }
        break;
      case 'code':
        if (tok.lang === 'mermaid') {
          diagram += 1;
          children.push(await mermaidPng(tok.text, resolve(diagDir, `${name}-${diagram}.png`)));
        } else {
          for (const line of tok.text.split('\n')) {
            children.push(new Paragraph({ children: [new TextRun({ text: line || ' ', font: 'Consolas', size: 16 })], shading: { type: ShadingType.CLEAR, fill: 'F2F1ED' }, spacing: { after: 0 } }));
          }
        }
        break;
      case 'table': {
        const cell = (c, header) => new TableCell({
          children: [new Paragraph({ children: runs(c.tokens, header ? { bold: true } : {}) })],
          shading: header ? { type: ShadingType.CLEAR, fill: 'E9E8E3' } : undefined,
        });
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ tableHeader: true, children: tok.header.map((c) => cell(c, true)) }), ...tok.rows.map((r) => new TableRow({ children: r.map((c) => cell(c, false)) }))],
        }));
        children.push(new Paragraph({ text: '' }));
        break;
      }
      default:
        break;
    }
  }

  const doc = new Document({
    creator: 'Equisteg',
    title: meta.title ?? name,
    features: { updateFields: true },
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [{
      children: [
        new Paragraph({ spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: meta.title ?? name, bold: true, size: 48, color: '1E5F74' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: meta.subtitle ?? '', size: 28 })] }),
        new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Version ${meta.version ?? '1.0'} · ${meta.date ?? ''} · Equisteg`, size: 22 })] }),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Contents' }),
        new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
        new Paragraph({ children: [new PageBreak()] }),
        ...children,
      ],
    }],
  });
  const out = file.replace(/\.md$/, '.docx');
  await writeFile(out, await Packer.toBuffer(doc));
  console.log('wrote', out, `(${diagram} diagrams)`);
}

for (const f of process.argv.slice(2)) await convert(resolve(f));
