#!/usr/bin/env node
/**
 * HTML Slide Deck Compiler
 *
 * Usage:
 *   node build.mjs <course-dir>            # auto-discover config + content
 *
 * Config layering:
 *   1. <course-dir>/config/global.yaml  (base — instructor, socials, footer, defaults)
 *   2. <course-dir>/config.yaml  (override — page, quotes, nav, etc.)
 *
 * Output: <course-dir>/index.html
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DECK_TEMPLATE = resolve(__dirname, '../reference/deck-template.html');

// ─── Detect GitHub Pages base URL from git remote ───
function detectGitHubPagesBase(cwd) {
  try {
    const remoteUrl = execSync('git remote get-url origin', { cwd, encoding: 'utf-8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
    if (match) {
      const [, owner, repo] = match;
      return `https://${owner}.github.io/${repo}`;
    }
  } catch { /* not a git repo or no remote */ }
  return null;
}

// ─── Deep merge ───
function deepMerge(base, override) {
  if (!override) return base;
  if (!base) return override;
  if (typeof base !== 'object' || typeof override !== 'object') return override;
  if (Array.isArray(override)) return override;

  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (key in result && typeof result[key] === 'object' && typeof override[key] === 'object'
      && !Array.isArray(result[key]) && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

// ─── Minimal YAML parser ───
function unquote(s) {
  if (!s) return '';
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

function parseYamlFull(text) {
  const cleanLines = text.split('\n').map(l => l.replace(/\s+$/, ''));
  return parseYamlBlock(cleanLines, 0, cleanLines.length, -1);
}

function parseYamlBlock(lines, start, end, parentIndent) {
  const result = {};
  let i = start;

  while (i < end) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) { i++; continue; }

    const indent = line.search(/\S/);
    if (indent <= parentIndent) break;

    if (line.trim().startsWith('- ')) { i++; continue; }

    const kvMatch = line.trim().match(/^([\w]+):\s*(.*)/);
    if (!kvMatch) { i++; continue; }

    const key = kvMatch[1];
    let val = kvMatch[2].trim();

    if (val === '>') {
      let mlVal = '';
      i++;
      while (i < end) {
        const nl = lines[i];
        if (nl.trim() === '' || /^\s*#/.test(nl)) { i++; continue; }
        const ni = nl.search(/\S/);
        if (ni <= indent) break;
        mlVal += (mlVal ? ' ' : '') + nl.trim();
        i++;
      }
      result[key] = mlVal;
      continue;
    }

    const nextNonEmpty = findNextNonEmpty(lines, i + 1, end);
    if (nextNonEmpty < end && lines[nextNonEmpty].trim().startsWith('- ')) {
      const nextIndent = lines[nextNonEmpty].search(/\S/);
      if (nextIndent > indent) {
        result[key] = parseYamlArray(lines, i + 1, end, indent);
        i = skipBlock(lines, i + 1, end, indent);
        continue;
      }
    }

    if (val === '') {
      const ni = findNextNonEmpty(lines, i + 1, end);
      if (ni < end && lines[ni].search(/\S/) > indent) {
        result[key] = parseYamlBlock(lines, i + 1, end, indent);
        i = skipBlock(lines, i + 1, end, indent);
        continue;
      }
    }

    result[key] = unquote(val);
    i++;
  }

  return result;
}

function parseYamlArray(lines, start, end, parentIndent) {
  const result = [];
  let i = start;

  while (i < end) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) { i++; continue; }

    const indent = line.search(/\S/);
    if (indent <= parentIndent) break;

    if (line.trim().startsWith('- ')) {
      const content = line.trim().slice(2).trim();
      const kvMatch = content.match(/^([\w]+):\s*(.*)/);

      if (kvMatch) {
        const obj = {};
        obj[kvMatch[1]] = kvMatch[2].trim() === '>'
          ? (() => { let v = ''; i++; while (i < end) { const l = lines[i]; if (l.trim() === '' || /^\s*#/.test(l)) { i++; continue; } if (l.search(/\S/) <= indent + 2) break; v += (v ? ' ' : '') + l.trim(); i++; } return v; })()
          : unquote(kvMatch[2]);

        if (kvMatch[2].trim() !== '>') i++;

        while (i < end) {
          const nl = lines[i];
          if (nl.trim() === '' || /^\s*#/.test(nl)) { i++; continue; }
          const ni = nl.search(/\S/);
          if (ni <= indent) break;
          if (nl.trim().startsWith('- ')) break;
          const nkv = nl.trim().match(/^([\w]+):\s*(.*)/);
          if (nkv) {
            if (nkv[2].trim() === '>') {
              let v = ''; i++;
              while (i < end) { const l = lines[i]; if (l.trim() === '' || /^\s*#/.test(l)) { i++; continue; } if (l.search(/\S/) <= ni) break; v += (v ? ' ' : '') + l.trim(); i++; }
              obj[nkv[1]] = v;
            } else {
              obj[nkv[1]] = unquote(nkv[2]);
              i++;
            }
          } else {
            i++;
          }
        }
        result.push(obj);
      } else {
        result.push(unquote(content));
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

function findNextNonEmpty(lines, start, end) {
  for (let i = start; i < end; i++) {
    if (lines[i].trim() !== '' && !/^\s*#/.test(lines[i])) return i;
  }
  return end;
}

function skipBlock(lines, start, end, parentIndent) {
  let i = start;
  while (i < end) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) { i++; continue; }
    if (line.search(/\S/) <= parentIndent) return i;
    i++;
  }
  return i;
}

// ─── Social SVG icons ───
const SOCIAL_SVGS = {
  Medium: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42S14.2 15.54 14.2 12s1.51-6.42 3.38-6.42 3.38 2.88 3.38 6.42zm2.94 0c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75c.66 0 1.19 2.58 1.19 5.75z"/></svg>',
  Facebook: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  Threads: '<svg width="16" height="16" viewBox="0 0 878 1000" fill="currentColor"><path d="M446.7,1000h-0.3c-149.2-1-263.9-50.2-341-146.2C36.9,768.3,1.5,649.4,0.3,500.4v-0.7c1.2-149.1,36.6-267.9,105.2-353.4C182.5,50.2,297.3,1,446.4,0h0.3h0.3c114.4,0.8,210.1,30.2,284.4,87.4c69.9,53.8,119.1,130.4,146.2,227.8l-85,23.7c-46-165-162.4-249.3-346-250.6c-121.2,0.9-212.9,39-272.5,113.2C118.4,271,89.6,371.4,88.5,500c1.1,128.6,29.9,229,85.7,298.5c59.6,74.3,151.3,112.4,272.5,113.2c109.3-0.8,181.6-26.3,241.7-85.2c68.6-67.2,67.4-149.7,45.4-199.9c-12.9-29.6-36.4-54.2-68.1-72.9c-8,56.3-25.9,101.9-53.5,136.3c-36.9,45.9-89.2,71-155.4,74.6c-50.1,2.7-98.4-9.1-135.8-33.4c-44.3-28.7-70.2-72.5-73-123.5c-2.7-49.6,17-95.2,55.4-128.4c36.7-31.7,88.3-50.3,149.3-53.8c44.9-2.5,87-0.5,125.8,5.9c-5.2-30.9-15.6-55.5-31.2-73.2c-21.4-24.4-54.5-36.8-98.3-37.1c-0.4,0-0.8,0-1.2,0c-35.2,0-83,9.7-113.4,55L261.2,327c40.8-60.6,107-94,186.6-94c0.6,0,1.2,0,1.8,0c133.1,0.8,212.4,82.3,220.3,224.5c4.5,1.9,9,3.9,13.4,5.9c62.1,29.2,107.5,73.4,131.4,127.9c33.2,75.9,36.3,199.6-64.5,298.3C673.1,965,579.6,999.1,447,1000L446.7,1000L446.7,1000z M488.5,512.9c-10.1,0-20.3,0.3-30.8,0.9c-76.5,4.3-124.2,39.4-121.5,89.3c2.8,52.3,60.5,76.6,116,73.6c51-2.7,117.4-22.6,128.6-154.6C552.6,516,521.7,512.9,488.5,512.9z"/></svg>',
  YouTube: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  GitHub: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>',
  LinkedIn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  Email: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>',
};

function socialLink(platform, url) {
  const svg = SOCIAL_SVGS[platform] || '';
  return `<a href="${esc(url)}" target="_blank" rel="noopener">${svg} <span>${esc(platform)}</span></a>`;
}

function esc(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function raw(s) { return typeof s === 'string' ? s : ''; }

// ─── Markdown parser ───
function parseContent(md) {
  const lines = md.split('\n');
  const sections = [];
  let current = null;
  let currentSub = null;
  let i = 0;
  let sectionNum = 0;
  let subNum = 0;
  const usedIds = new Set();

  function uniqueId(base) {
    const seed = base || 'section';
    let candidate = seed;
    let suffix = 2;
    while (usedIds.has(candidate)) {
      candidate = `${seed}-${suffix}`;
      suffix++;
    }
    usedIds.add(candidate);
    return candidate;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^---\s*$/.test(line.trim())) { i++; continue; }

    if (/^# /.test(line)) {
      sectionNum++;
      const title = line.replace(/^# /, '').trim();
      let label, h2;
      const colonMatch = title.match(/^(.+?)[：:]\s*(.+)/);
      if (colonMatch) {
        label = colonMatch[1].trim();
        h2 = colonMatch[2].trim();
      } else {
        label = title;
        h2 = title;
      }

      const id = uniqueId(generateId(title) || `section-${sectionNum}`);
      current = { type: 'section', num: sectionNum, label, h2, id, lead: '', subs: [], blocks: [] };
      currentSub = null;
      sections.push(current);

      if (i + 1 < lines.length && /^> /.test(lines[i + 1]) && !/^> \*\*/.test(lines[i + 1])) {
        i++;
        let lead = lines[i].replace(/^> /, '');
        while (i + 1 < lines.length && /^> /.test(lines[i + 1]) && !/^> \*\*/.test(lines[i + 1])) {
          i++;
          lead += '\n' + lines[i].replace(/^> /, '');
        }
        current.lead = lead.trim();
      }
      i++; continue;
    }

    if (/^## /.test(line)) {
      const title = line.replace(/^## /, '').trim();
      subNum++;
      const subId = uniqueId('sub-' + (generateId(title) || `section-${subNum}`));
      currentSub = { title, id: subId };
      if (current) {
        current.subs.push(currentSub);
        current.blocks.push({ type: 'sub-title', title, id: subId });
      }
      i++; continue;
    }

    // youtube embed
    if (/^\[youtube/.test(line.trim())) {
      const idMatch = line.match(/id="([^"]+)"/);
      const titleMatch = line.match(/title="([^"]+)"/);
      const vid = idMatch ? idMatch[1] : '';
      let caption = titleMatch ? titleMatch[1] : '';
      const isSingleLineYoutube = /^\[youtube\b[^\]]*\]\s*$/.test(line.trim());
      if (!isSingleLineYoutube) {
        i++;
        const captionLines = [];
        while (i < lines.length && !/^\[\/youtube\]/.test(lines[i].trim())) {
          if (lines[i].trim() !== '') captionLines.push(lines[i].trim());
          i++;
        }
        i++;
        if (!caption && captionLines.length) caption = captionLines.join(' ');
      } else {
        i++;
      }
      if (current && vid) current.blocks.push({ type: 'youtube', id: vid, caption });
      continue;
    }

    // local video embed
    if (/^\[video/.test(line.trim())) {
      const srcMatch = line.match(/src="([^"]+)"/);
      const titleMatch = line.match(/title="([^"]+)"/);
      const src = srcMatch ? srcMatch[1] : '';
      const title = titleMatch ? titleMatch[1] : '';
      if (current && src) current.blocks.push({ type: 'video', src, title });
      i++;
      continue;
    }

    // button
    if (/^\[button/.test(line.trim())) {
      const hrefMatch = line.match(/href="([^"]+)"/);
      const labelMatch = line.match(/label="([^"]+)"/);
      const href = hrefMatch ? hrefMatch[1] : '';
      const label = labelMatch ? labelMatch[1] : '';
      if (current && href) current.blocks.push({ type: 'button', href, label });
      i++;
      continue;
    }

    // image-text block
    if (/^\[image-text/.test(line.trim())) {
      const posMatch = line.match(/position="(left|right)"/);
      const position = posMatch ? posMatch[1] : 'left';
      const widthMatch = line.match(/width="(\d+)%?"/);
      const imgWidth = widthMatch ? parseInt(widthMatch[1], 10) : 40;
      let imgSrc = '', imgAlt = '';
      const textLines = [];
      i++;
      while (i < lines.length && !/^\[\/image-text\]/.test(lines[i].trim())) {
        const imgMatch = lines[i].trim().match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        if (imgMatch && !imgSrc) {
          imgAlt = imgMatch[1];
          imgSrc = imgMatch[2];
        } else if (lines[i].trim() !== '') {
          textLines.push(lines[i]);
        }
        i++;
      }
      i++; // skip [/image-text]
      if (current) current.blocks.push({ type: 'image-text', position, imgWidth, imgSrc, imgAlt, textLines });
      continue;
    }

    // standalone image
    if (/^!\[([^\]]*)\]\(([^)]+)\)/.test(line.trim()) && current) {
      const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      current.blocks.push({ type: 'image', alt: imgMatch[1], src: imgMatch[2] });
      i++; continue;
    }

    if (isMarkdownTableHeader(line, lines[i + 1]) && current) {
      const headers = parseMarkdownTableRow(line);
      const aligns = parseMarkdownTableAlignments(lines[i + 1]);
      const rows = [];
      i += 2;
      while (i < lines.length) {
        const rowLine = lines[i];
        if (rowLine.trim() === '' || !rowLine.includes('|')) break;
        rows.push(parseMarkdownTableRow(rowLine));
        i++;
      }
      current.blocks.push({ type: 'table', headers, aligns, rows });
      continue;
    }

    if (/^### /.test(line)) {
      const title = line.replace(/^### /, '').trim();
      const emojiMatch = title.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)/u);
      const icon = emojiMatch ? emojiMatch[1] : '';
      const cardTitle = emojiMatch ? emojiMatch[2] : title;
      const card = { type: 'card', icon, title: cardTitle, items: [] };

      i++;
      while (i < lines.length) {
        const cl = lines[i];
        if (/^#{1,3} /.test(cl) || /^---\s*$/.test(cl.trim())) break;
        if (/^```(prompt|terminal)/i.test(cl) || /^\[flow\]/.test(cl) || /^\[tags\]/.test(cl) || /^\[summary\]/.test(cl) || /^\[bonus/.test(cl) || /^> \*\*/.test(cl) || /^\[image-text/.test(cl) || /^\[youtube/.test(cl)) break;
        if (/^- \[x\]/.test(cl) || /^!\[/.test(cl)) break;
        if (isMarkdownTableHeader(cl, lines[i + 1])) break;

        if (cl.trim() === '' && card.items.length > 0) {
          i++;
          break;
        }

        if (/^- /.test(cl) && !/^- \[/.test(cl)) {
          card.items.push({ type: 'li', text: inlineFormat(cl.replace(/^- /, '').trim()) });
        } else if (cl.trim() !== '') {
          card.items.push({ type: 'p', text: inlineFormat(cl.trim()) });
        }
        i++;
      }
      if (current) current.blocks.push(card);
      continue;
    }

    if (/^#### /.test(line) && current) {
      const title = line.replace(/^#### /, '').trim();
      current.blocks.push({ type: 'minor-title', title });
      i++;
      continue;
    }

    if (/^```(prompt|terminal|Terminal|Prompt)/i.test(line)) {
      const langMatch = line.match(/^```(\w+)/);
      const lang = langMatch ? langMatch[1].toLowerCase() : 'prompt';
      const labelMatch = line.match(/\[label="([^"]+)"\]/);
      const label = labelMatch ? labelMatch[1] : '';
      let body = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '```') {
        body += (body ? '\n' : '') + lines[i];
        i++;
      }
      i++;
      let headerType;
      if (lang === 'terminal') {
        headerType = 'Terminal';
      } else if (lang === 'prompt') {
        const isTerminal = /^(npm |npx |openspec |git |docker |curl |brew |apt |pip |cargo |\/init)/.test(body.trim());
        headerType = isTerminal ? 'Terminal' : 'Prompt';
      } else {
        headerType = 'Prompt';
      }
      if (current) current.blocks.push({ type: 'prompt', label, body, headerType });
      continue;
    }

    if (/^\[flow\]/.test(line.trim())) {
      const steps = [];
      i++;
      while (i < lines.length && !/^\[\/flow\]/.test(lines[i].trim())) {
        const stepMatch = lines[i].trim().match(/^\d+\.\s+(.*)/);
        if (stepMatch) {
          const parts = stepMatch[1].split(/\s[—–-]\s/);
          steps.push({ title: parts[0].trim(), desc: parts[1] ? parts[1].trim() : '' });
        }
        i++;
      }
      i++;
      if (current) current.blocks.push({ type: 'flow', steps });
      continue;
    }

    if (/^\[tags\]/.test(line.trim())) {
      const tags = [];
      i++;
      while (i < lines.length && !/^\[\/tags\]/.test(lines[i].trim())) {
        const tagMatch = lines[i].trim().match(/^-\s+\[(green|orange|purple|blue)\]\s+(.*)/);
        if (tagMatch) {
          tags.push({ color: tagMatch[1], text: tagMatch[2] });
        }
        i++;
      }
      i++;
      if (current) current.blocks.push({ type: 'tags', tags });
      continue;
    }

    if (/^\[summary\]/.test(line.trim())) {
      const items = [];
      i++;
      while (i < lines.length && !/^\[\/summary\]/.test(lines[i].trim())) {
        const sumMatch = lines[i].trim().match(/^-\s+(\S+)\s+\*\*(.+?)\*\*\s*\|\s*(.*)/);
        if (sumMatch) {
          items.push({ icon: sumMatch[1], title: sumMatch[2], desc: sumMatch[3].trim() });
        }
        i++;
      }
      i++;
      if (current) current.blocks.push({ type: 'summary', items });
      continue;
    }

    if (/^\[bonus/.test(line.trim())) {
      const titleMatch = line.match(/title="([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : 'Bonus';
      let content = '';
      i++;
      while (i < lines.length && !/^\[\/bonus\]/.test(lines[i].trim())) {
        content += (content ? '\n' : '') + lines[i];
        i++;
      }
      i++;
      if (current) current.blocks.push({ type: 'bonus', title, content });
      continue;
    }

    if (/^> \*\*/.test(line)) {
      const titleMatch = line.match(/^> \*\*(.+?)\*\*/);
      const insightTitle = titleMatch ? titleMatch[1] : '';
      const paragraphs = [];
      const bullets = [];
      let restOfLine = line.replace(/^> \*\*.+?\*\*\s*/, '').trim();

      let currentPara = restOfLine;
      i++;

      while (i < lines.length && /^>/.test(lines[i])) {
        const content = lines[i].replace(/^>\s?/, '').trim();
        if (content === '') {
          if (currentPara) paragraphs.push(currentPara);
          currentPara = '';
        } else if (/^- /.test(content)) {
          if (currentPara) {
            paragraphs.push(currentPara);
            currentPara = '';
          }
          bullets.push(inlineFormat(content.replace(/^- /, '').trim()));
        } else {
          currentPara += (currentPara ? '\n' : '') + content;
        }
        i++;
      }
      if (currentPara) paragraphs.push(currentPara);

      if (current) current.blocks.push({
        type: 'insight',
        title: insightTitle,
        paragraphs: paragraphs.map(inlineFormatWithBreaks),
        bullets,
      });
      continue;
    }

    if (/^> /.test(line) && !/^> \*\*/.test(line)) {
      const paragraphs = [];
      let currentPara = line.replace(/^>\s?/, '').trim();
      i++;
      while (i < lines.length && /^>/.test(lines[i])) {
        const content = lines[i].replace(/^>\s?/, '').trim();
        if (content === '') {
          if (currentPara) paragraphs.push(currentPara);
          currentPara = '';
        } else {
          currentPara += (currentPara ? '\n' : '') + content;
        }
        i++;
      }
      if (currentPara) paragraphs.push(currentPara);
      if (current) current.blocks.push({ type: 'insight', title: '', paragraphs: paragraphs.map(inlineFormatWithBreaks) });
      continue;
    }

    if (/^- \[x\]/.test(line)) {
      const items = [];
      while (i < lines.length && /^- \[x\]/.test(lines[i])) {
        items.push(lines[i].replace(/^- \[x\]\s*/, '').trim());
        i++;
      }
      if (current) current.blocks.push({ type: 'checklist', items });
      continue;
    }

    if (/^- /.test(line) && !/^- \[/.test(line) && current) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i]) && !/^- \[/.test(lines[i])) {
        items.push(inlineFormat(lines[i].replace(/^- /, '').trim()));
        i++;
      }
      current.blocks.push({ type: 'list', items });
      continue;
    }

    if (line.trim() !== '' && current && !/^#{1,4} /.test(line)) {
      current.blocks.push({ type: 'paragraph', text: inlineFormat(line.trim()) });
      i++; continue;
    }

    i++;
  }

  return sections;
}

function generateId(title) {
  const map = {
    '新專案': 'new-project', '舊專案': 'old-project', '導入測試': 'testing', '總結': 'summary',
    'OpenSpec 初始化': 'openspec-init', '從零建立專案': 'create-project', '建立專案規則': 'project-rules',
    'OpenSpec 迭代': 'openspec-iterate', '設定 Commit Skill': 'commit-skill', 'Commit Skill': 'commit-skill',
    '設定 PR Skill': 'pr-skill', 'PR Skill': 'pr-skill',
    'Git Worktree 並行開發': 'worktree', 'Worktree': 'worktree',
    'gen-test-cases': 'gen-test', 'GitHub Action 自動化': 'github-action', 'GitHub Action': 'github-action',
  };

  for (const [k, v] of Object.entries(map)) {
    if (title.includes(k)) return v;
  }

  return title
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function isMarkdownTableSeparator(line) {
  const trimmed = (line || '').trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function isMarkdownTableHeader(line, nextLine) {
  return !!line && !!nextLine && line.includes('|') && isMarkdownTableSeparator(nextLine);
}

function parseMarkdownTableRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}

function parseMarkdownTableAlignments(line) {
  return parseMarkdownTableRow(line).map(cell => {
    const isLeft = cell.startsWith(':');
    const isRight = cell.endsWith(':');
    if (isLeft && isRight) return 'center';
    if (isRight) return 'right';
    return 'left';
  });
}

function inlineFormat(text) {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline-image">')
    .replace(/\*\*(.+?)\*\"/g, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function inlineFormatWithBreaks(text) {
  return inlineFormat(text).replace(/\n/g, '<br>');
}

function stripInlineMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

// ─── Block rendering ───
function renderBlockBody(block) {
  switch (block.type) {
    case 'sub-title':
      return `<div class="sub-title" id="${block.id}"><span class="bar"></span>${inlineFormat(block.title)}</div>`;

    case 'minor-title':
      return `<h4 class="minor-title">${esc(block.title)}</h4>`;

    case 'prompt':
      return `<div class="prompt-block">
      <div class="prompt-header">
        <div class="dots"><span></span><span></span><span></span></div>
        ${block.headerType}
        <span class="label">${esc(block.label)}</span>
        <button class="copy-btn" aria-label="複製" onclick="copyPrompt(this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
      <div class="prompt-body">${esc(block.body)}</div>
    </div>`;

    case 'flow': {
      let s = `<div class="flow">\n`;
      block.steps.forEach((step, idx) => {
        s += `      <div class="flow-step">
        <div class="step-num">${idx + 1}</div>
        <div class="step-content">
          <div class="step-title">${inlineFormat(step.title)}</div>
          <div class="step-desc">${inlineFormat(step.desc)}</div>
        </div>
      </div>\n`;
      });
      s += `    </div>`;
      return s;
    }

    case 'tags': {
      let s = `<div class="tags">\n`;
      for (const t of block.tags) {
        s += `      <span class="tag ${t.color}">${esc(t.text)}</span>\n`;
      }
      s += `    </div>`;
      return s;
    }

    case 'insight': {
      let s = `<div class="insight">\n`;
      if (block.title) s += `      <div class="insight-title">${inlineFormat(block.title)}</div>\n`;
      block.paragraphs.forEach((p, idx) => {
        s += `      <p${idx > 0 ? ' style="margin-top:.5rem"' : ''}>${p}</p>\n`;
      });
      if (block.bullets && block.bullets.length) {
        s += `      <ul>\n`;
        for (const b of block.bullets) s += `        <li>${b}</li>\n`;
        s += `      </ul>\n`;
      }
      s += `    </div>`;
      return s;
    }

    case 'checklist': {
      let s = `<ul class="checklist">\n`;
      for (const item of block.items) s += `      <li>${inlineFormat(item)}</li>\n`;
      s += `    </ul>`;
      return s;
    }

    case 'summary': {
      let s = `<div class="summary-grid">\n`;
      for (const item of block.items) {
        s += `      <div class="summary-card">
        <div class="sc-icon">${item.icon}</div>
        <h4>${esc(item.title)}</h4>
        <p>${inlineFormat(item.desc)}</p>
      </div>\n`;
      }
      s += `    </div>`;
      return s;
    }

    case 'table': {
      let s = `<div class="table-wrap">\n      <table class="content-table compare">\n        <thead>\n          <tr>\n`;
      block.headers.forEach((header, idx) => {
        s += `            <th class="align-${block.aligns[idx] || 'left'}">${inlineFormat(header)}</th>\n`;
      });
      s += `          </tr>\n        </thead>\n        <tbody>\n`;
      block.rows.forEach((row) => {
        s += `          <tr>\n`;
        block.headers.forEach((_, idx) => {
          s += `            <td class="align-${block.aligns[idx] || 'left'}">${inlineFormat(row[idx] || '')}</td>\n`;
        });
        s += `          </tr>\n`;
      });
      s += `        </tbody>\n      </table>\n    </div>`;
      return s;
    }

    case 'list': {
      let s = `<ul class="loose-list list">\n`;
      for (const item of block.items) s += `      <li>${item}</li>\n`;
      s += `    </ul>`;
      return s;
    }

    case 'bonus':
      return `<button class="bonus-btn" data-bonus-title="${esc(block.title)}" data-bonus-content="${esc(block.content)}">
      ${esc(block.title)}
    </button>`;

    case 'youtube':
      return `<div class="youtube-embed">
      <div class="video-frame">
        <iframe src="https://www.youtube.com/embed/${esc(block.id)}" title="${esc(block.caption || 'YouTube video')}" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
      ${block.caption ? `<p class="youtube-caption" style="margin-top:8px">${inlineFormat(block.caption)}</p>` : ''}
    </div>`;

    case 'image':
      return `<figure class="content-image" style="margin: 16px 0 0">
      <a class="image-open-link" href="${esc(block.src)}" target="_blank" rel="noopener" aria-label="開啟原始圖片">
        <img src="${esc(block.src)}" alt="${esc(block.alt)}" loading="lazy" style="max-height: 380px; object-fit: contain; border-radius: var(--radius)">
      </a>
      ${block.alt ? `<figcaption style="margin-top:6px;font-size:12px;color:var(--text-dim)">${esc(block.alt)}</figcaption>` : ''}
    </figure>`;

    case 'image-text': {
      const imgPos = block.position === 'right' ? 'image-text--img-right' : '';
      const widthStyle = block.imgWidth !== 40 ? ` style="--img-width:${block.imgWidth}%"` : '';
      let bodyHtml = '';
      for (const tl of block.textLines) {
        if (/^- /.test(tl)) {
          bodyHtml += `<li>${inlineFormat(tl.replace(/^- /, '').trim())}</li>\n`;
        } else {
          bodyHtml += `<p>${inlineFormat(tl.trim())}</p>\n`;
        }
      }
      bodyHtml = bodyHtml.replace(/((?:<li>.*<\/li>\n)+)/g, '<ul>\n$1</ul>\n');
      return `<div class="image-text ${imgPos}"${widthStyle}>
      <div class="image-text__img" style="margin-bottom:12px">
        <a class="image-open-link" href="${esc(block.imgSrc)}" target="_blank" rel="noopener" aria-label="開啟原始圖片">
          <img src="${esc(block.imgSrc)}" alt="${esc(block.imgAlt)}" loading="lazy" style="max-height: 280px; object-fit: contain; border-radius: var(--radius)">
        </a>
      </div>
      <div class="image-text__body">
        ${bodyHtml.trim()}
      </div>
    </div>`;
    }

    case 'paragraph':
      return `<p class="loose-text">${block.text}</p>`;

    case 'video':
      return `<figure class="media-video">
      <video controls preload="metadata" src="${esc(block.src)}" style="max-height: 380px; width: 100%; object-fit: contain; border-radius: var(--radius)"></video>
      ${block.title ? `<figcaption>${esc(block.title)}</figcaption>` : ''}
    </figure>`;

    case 'button':
      return `<p class="action-button-row" style="margin-top:14px"><a class="action-button" href="${esc(block.href)}" target="_blank" rel="noopener" style="display:inline-flex;padding:8px 16px;background:var(--accent);color:#fff;border-radius:var(--radius);text-decoration:none;font-weight:700">${esc(block.label || 'Open link')}</a></p>`;

    default:
      return '';
  }
}

// ─── Group section blocks into slides ───
function groupSectionIntoSlides(sec) {
  const slides = [];
  let currentSlide = null;

  for (const block of sec.blocks) {
    if (block.type === 'card') {
      if (currentSlide) slides.push(currentSlide);
      currentSlide = {
        type: 'content',
        title: block.title,
        icon: block.icon,
        bullets: block.items,
        blocks: []
      };
    } else if (block.type === 'sub-title') {
      if (currentSlide) slides.push(currentSlide);
      currentSlide = {
        type: 'subtitle',
        title: block.title,
        blocks: []
      };
    } else {
      if (!currentSlide) {
        currentSlide = {
          type: 'intro',
          title: sec.label,
          blocks: []
        };
      }
      currentSlide.blocks.push(block);
    }
  }
  if (currentSlide) slides.push(currentSlide);
  return slides;
}

// ─── Dynamic Slide HTML Compiler ───
function buildSlidesHtml(sections, cfg, globalRoot, courseDir) {
  let html = '';

  // 1. Cover Slide
  const coverImg = resolveLocalAssetPath(cfg.page?.hero_image || 'assets/slide-01.jpg', globalRoot, courseDir) || '';
  const emblemImg = resolveLocalAssetPath(cfg.footer?.emblem || '', globalRoot, courseDir) || '';

  html += `  <section class="slide active" data-section="OPEN" data-role="non-content">
    ${coverImg ? `<div class="full-img"><img src="${esc(coverImg)}" alt=""></div>` : ''}
    <div class="slide-inner closing">
      <span class="kicker">${esc(cfg.page?.badge || 'COURSE DECK')}</span>
      <h1 style="color: var(--accent2)">${raw(cfg.page?.hero_title || cfg.page?.title || '')}</h1>
      <p class="lead" style="color: var(--text-dim); font-weight: 700">${esc(cfg.page?.subtitle || '')}</p>
      ${cfg.quotes?.opening ? `<div class="answer gradient" style="font-size:24px;margin-top:20px">${raw(cfg.quotes.opening.text)}</div>` : ''}
    </div>
  </section>\n`;

  // 2. Instructor Slide
  const inst = cfg.instructor || {};
  const avatarImg = resolveLocalAssetPath(inst.avatar || '', globalRoot, courseDir) || '';
  const avatarHtml = avatarImg
    ? `<div class="instructor-avatar"><img src="${esc(avatarImg)}" alt="${esc(inst.name)}"></div>`
    : `<div class="instructor-avatar"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-card-alt);font-size:64px;color:var(--text-dim)">👤</div></div>`;

  const statsHtml = (inst.stats || []).map(s => {
    const label = s.value
      ? `${raw(s.icon || '')} ${esc(s.text)} <strong>${esc(s.value)}</strong> ${esc(s.unit || '')}`
      : inlineFormat(s.text || '');
    return s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${label}</a>` : `<span>${label}</span>`;
  }).join('\n          ');

  const socialsHtml = (inst.socials || []).map(s =>
    `          ${socialLink(s.platform, s.url)}`
  ).join('\n');

  html += `  <section class="slide" data-section="INSTRUCTOR" data-role="non-content" data-layout="layout_02_instructor">
    <div class="slide-inner instructor-layout">
      ${avatarHtml}
      <div>
        <span class="kicker">INSTRUCTOR</span>
        <h1 style="font-size: 42px; margin-bottom:8px">${esc(inst.name)}</h1>
        <p class="lead" style="margin-top:0; font-size:18px">${esc(inst.tagline)}</p>
        <div class="instructor-bio">${raw(inst.bio || '').replace(/\n/g, '<br>')}</div>
        <div class="instructor-meta" style="margin-top:16px">
          ${statsHtml}
        </div>
        <div class="social-links instructor-links" style="margin-top:16px">
${socialsHtml}
        </div>
      </div>
    </div>
  </section>\n`;

  // Pre-calculate start indices for sections
  let slideIndex = 4; // Cover(1) + Instructor(2) + Agenda(3) + first Transition(4)
  const sectionStartSlides = [];

  for (let i = 0; i < sections.length; i++) {
    sectionStartSlides.push(slideIndex);
    const grouped = groupSectionIntoSlides(sections[i]);
    slideIndex += 1 + grouped.length;
  }

  // 3. Agenda Slide
  let agendaCards = '';
  sections.forEach((sec, i) => {
    const cleanLabel = sec.label.replace(/[：:].*/, '').trim();
    const subtext = sec.lead ? sec.lead.slice(0, 50) + (sec.lead.length > 50 ? '...' : '') : '進入章節探索詳細內容。';
    const numDisplay = cleanLabel === '總結' ? '★' : (i + 1).toString().padStart(2, '0');
    agendaCards += `        <article class="type-card" onclick="goto(${sectionStartSlides[i]})">
          <span class="badge">CHAPTER ${numDisplay}</span>
          <h3>${esc(cleanLabel)}</h3>
          <p>${esc(subtext)}</p>
        </article>\n`;
  });

  html += `  <section class="slide" data-section="MAP" data-role="non-content">
    <div class="slide-inner">
      <span class="kicker">OVERVIEW</span>
      <h1>課程大綱</h1>
      <div class="three-col" style="margin-top:36px">
${agendaCards}      </div>
    </div>
  </section>\n`;

  // 4. Render Section Transitions & Slides
  sections.forEach((sec, secIdx) => {
    const cleanLabel = sec.label.replace(/[：:].*/, '').trim();
    // Transition Slide
    html += `  <section class="slide" data-section="TRANSITION" data-role="non-content" data-layout="layout_04_transition">
    <div class="slide-inner">
      <div class="focus-card">
        <span class="kicker">CHAPTER ${(secIdx + 1).toString().padStart(2, '0')}</span>
        <h1>${esc(sec.h2)}</h1>
        ${sec.lead ? `<p class="lead">${inlineFormatWithBreaks(sec.lead)}</p>` : ''}
      </div>
    </div>
  </section>\n`;

    // Content Slides
    const groupedSlides = groupSectionIntoSlides(sec);
    groupedSlides.forEach((slide) => {
      const isIntro = slide.type === 'intro';
      const isSub = slide.type === 'subtitle';

      // Special layout checks
      const hasImageText = slide.blocks.some(b => b.type === 'image-text');
      const hasVideo = slide.blocks.some(b => b.type === 'video' || b.type === 'youtube');

      if (hasImageText && slide.type === 'content') {
        const imgBlock = slide.blocks.find(b => b.type === 'image-text');
        const bulletLines = (slide.bullets || []).map(b => `<li>${b.text}</li>`).join('\n');
        const extraLines = slide.blocks.filter(b => b !== imgBlock).map(b => renderBlockBody(b)).join('\n');

        let imgPosClass = imgBlock.position === 'right' ? 'flip' : '';
        const imgTagHtml = imgBlock.imgAlt ? `<span class="img-tag">${esc(imgBlock.imgAlt)}</span>` : '';

        html += `  <section class="slide" data-section="CONTENT" data-role="content" data-nav-label="${esc(cleanLabel)}">
    <div class="slide-inner split ${imgPosClass}">
      <div class="split-img">${imgTagHtml}<img src="${esc(imgBlock.imgSrc)}" alt=""></div>
      <div class="text">
        <span class="kicker">DETAIL</span>
        <h1>${esc(slide.title)}</h1>
        <p class="lead" style="font-size:18px">${imgBlock.textLines.map(t => inlineFormat(t)).join('<br>')}</p>
        <ul class="list">
          ${bulletLines}
        </ul>
        ${extraLines ? `<div style="margin-top:14px">${extraLines}</div>` : ''}
      </div>
    </div>
  </section>\n`;

      } else if (hasVideo && slide.type === 'content') {
        const vidBlock = slide.blocks.find(b => b.type === 'video' || b.type === 'youtube');
        const extraLines = slide.blocks.filter(b => b !== vidBlock).map(b => renderBlockBody(b)).join('\n');
        let playerHtml = '';
        let toolsHtml = '';

        if (vidBlock.type === 'video') {
          playerHtml = `<video controls src="${esc(vidBlock.src)}"></video>`;
        } else {
          playerHtml = `<iframe src="https://www.youtube.com/embed/${esc(vidBlock.id)}" title="${esc(vidBlock.caption || 'YouTube video')}" frameborder="0" allowfullscreen></iframe>`;
          toolsHtml = `<a class="youtube-open" href="https://www.youtube.com/watch?v=${esc(vidBlock.id)}" target="_blank" rel="noopener">開啟 YouTube</a>`;
        }

        const bulletLines = (slide.bullets || []).map(b => `<article class="watch-item"><h3>重點觀念</h3><p>${b.text}</p></article>`).join('\n');

        html += `  <section class="slide" data-section="CONTENT" data-role="content" data-nav-label="${esc(cleanLabel)}">
    <div class="slide-inner video-layout">
      <div class="video-media">
        <div class="video-frame">
          ${playerHtml}
        </div>
        ${toolsHtml ? `<div class="video-tools">${toolsHtml}</div>` : ''}
      </div>
      <div>
        <span class="kicker">VIDEO PRESENTATION</span>
        <h1>${esc(slide.title)}</h1>
        ${vidBlock.caption ? `<p class="lead">${inlineFormat(vidBlock.caption)}</p>` : ''}
        <div class="watch-list">
          ${bulletLines}
        </div>
        ${extraLines}
      </div>
    </div>
  </section>\n`;

      } else if (isSub) {
        const bodyHtml = slide.blocks.map(b => renderBlockBody(b)).join('\n');
        html += `  <section class="slide" data-section="CONTENT" data-role="content" data-nav-label="${esc(cleanLabel)}">
    <div class="slide-inner">
      <div class="focus-card">
        <span class="kicker">SUBSECTION</span>
        <h1>${inlineFormat(slide.title)}</h1>
        <div style="margin-top:20px">${bodyHtml}</div>
      </div>
    </div>
  </section>\n`;

      } else {
        // Standard card slide
        const kicker = isIntro ? 'INTRODUCTION' : 'DETAIL';
        const titleText = esc(slide.title);
        let bulletsHtml = '';

        if (slide.bullets && slide.bullets.length > 0) {
          bulletsHtml += `<ul class="list">\n`;
          slide.bullets.forEach(b => {
            bulletsHtml += `          <li>${b.text}</li>\n`;
          });
          bulletsHtml += `        </ul>\n`;
        }

        const bodyHtml = slide.blocks.map(b => renderBlockBody(b)).join('\n');

        html += `  <section class="slide" data-section="CONTENT" data-role="content" data-nav-label="${esc(cleanLabel)}">
    <div class="slide-inner">
      <span class="kicker">${kicker}</span>
      <h1>${titleText}</h1>
      ${bulletsHtml}
      ${bodyHtml ? `<div style="margin-top:20px; width:100%">${bodyHtml}</div>` : ''}
    </div>
  </section>\n`;
      }
    });
  });

  // 5. Back Cover Slide
  const footerSocialsHtml = (inst.socials || []).map(s =>
    `          ${socialLink(s.platform, s.url)}`
  ).join('\n');

  html += `  <section class="slide back-cover" data-section="CTA" data-role="non-content">
    ${coverImg ? `<div class="full-img"><img src="${esc(coverImg)}" alt=""></div>` : ''}
    <div class="slide-inner closing">
      <div class="back-cover-title" aria-label="簡報結束 恭請講評">
        <span>簡報結束</span>
        ${emblemImg ? `<img class="back-cover-emblem" src="${esc(emblemImg)}" alt="Organization emblem">` : ''}
        <span>恭請講評</span>
      </div>
      <div class="back-cover-socials">
        <p>${esc(cfg.footer?.cta || '')}</p>
        <div class="social-links" style="margin-top:16px">
${footerSocialsHtml}        </div>
      </div>
    </div>
  </section>\n`;

  return html;
}

// ─── Config loading with layering ───
function findGlobalConfig(courseDir) {
  const candidate = join(courseDir, 'config/global.yaml');
  return existsSync(candidate) ? candidate : null;
}

function loadConfig(courseDir) {
  let cfg = {};
  let globalRoot = dirname(courseDir);

  const globalConfig = findGlobalConfig(courseDir);
  if (!globalConfig) {
    throw new Error(`Missing required global config: ${join(courseDir, 'config/global.yaml')}`);
  }

  const globalRaw = readFileSync(globalConfig, 'utf-8');
  cfg = parseYamlFull(globalRaw);
  globalRoot = courseDir;
  console.log(`   Global config: ${globalConfig}`);

  const courseConfig = join(courseDir, 'config.yaml');
  if (existsSync(courseConfig)) {
    const courseRaw = readFileSync(courseConfig, 'utf-8');
    const courseCfg = parseYamlFull(courseRaw);
    cfg = deepMerge(cfg, courseCfg);
    console.log(`   Course config: ${courseConfig}`);
  } else {
    console.log(`   Course config: (none, using global only)`);
  }

  return { cfg, globalRoot };
}

// Local asset path normalization
function resolveLocalAssetPath(src, rootDir, courseDir) {
  if (!src || src.startsWith('data:') || /^https?:\/\//.test(src)) return src;

  let absPath = resolve(rootDir, src);
  if (!existsSync(absPath)) {
    for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']) {
      const candidate = absPath + '.' + ext;
      if (existsSync(candidate)) {
        absPath = candidate;
        break;
      }
    }
  }

  if (!existsSync(absPath)) return null;

  return relative(courseDir, absPath).replace(/\\/g, '/');
}

// Main build
function build(courseDir) {
  const contentPath = join(courseDir, 'content.md');
  const outputPath = join(courseDir, 'index.html');

  if (!existsSync(contentPath)) {
    console.error(`❌ Content file not found: ${contentPath}`);
    process.exit(1);
  }

  console.log(`\n🔨 Building HTML Slide Deck: ${courseDir}`);

  const { cfg, globalRoot } = loadConfig(courseDir);

  if (cfg.page?.favicon) {
    const faviconPath = resolveLocalAssetPath(cfg.page.favicon, globalRoot, courseDir);
    if (faviconPath) {
      cfg.page.favicon = faviconPath;
    }
  }

  if (cfg.instructor?.avatar) {
    const avatarPath = resolveLocalAssetPath(cfg.instructor.avatar, globalRoot, courseDir);
    if (avatarPath) cfg.instructor.avatar = avatarPath;
  }

  if (cfg.footer?.emblem) {
    const emblemPath = resolveLocalAssetPath(cfg.footer.emblem, globalRoot, courseDir);
    if (emblemPath) cfg.footer.emblem = emblemPath;
  }

  const contentRaw = readFileSync(contentPath, 'utf-8');
  const templateRaw = readFileSync(DECK_TEMPLATE, 'utf-8');

  const sections = parseContent(contentRaw);
  const slidesHtml = buildSlidesHtml(sections, cfg, globalRoot, courseDir);

  let html = templateRaw;
  html = html.replace(/<!--[\s\S]*?-->\n?/g, '');

  const replacements = {
    '{{PAGE_LANG}}': cfg.page?.lang || 'zh-TW',
    '{{PAGE_THEME}}': cfg.page?.theme || 'modern-magazine',
    '{{PAGE_TITLE}}': cfg.page?.title || 'HTML Deck Presentation',
    '{{FAVICON}}': cfg.page?.favicon || '',
    '{{SLIDES}}': slidesHtml,
  };

  for (const [key, val] of Object.entries(replacements)) {
    const name = key.replace(/^\{\{/, '').replace(/\}\}$/, '');
    const pattern = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g');
    html = html.replace(pattern, val);
  }

  writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ Slide Deck Generated: ${outputPath}`);
  console.log(`   Slides compiled: ${sections.length + 3 + sections.reduce((a, s) => a + groupSectionIntoSlides(s).length, 0) + 1}`);
}

// ─── CLI ───
const __build_filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __build_filename) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node build.mjs <course-dir>            # e.g. node build.mjs example');
    process.exit(1);
  }

  let input = args[0];
  let courseDir;
  const resolved = resolve(input);

  if (existsSync(resolved) && statSync(resolved).isDirectory()) {
    courseDir = resolved;
  } else if (input.endsWith('.md')) {
    courseDir = dirname(resolved);
  } else {
    courseDir = resolved;
  }

  build(courseDir);
}
