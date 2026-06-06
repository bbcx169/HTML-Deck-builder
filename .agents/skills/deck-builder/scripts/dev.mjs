#!/usr/bin/env node
/**
 * HTML Slide Deck Dev Server
 *
 * Usage:
 *   node dev.mjs <course-dir>          # e.g. node dev.mjs example
 *   node dev.mjs <course-dir> --port 8080
 *
 * Features:
 *   - Watches content.md, config.yaml, global.yaml, deck-template.html for changes
 *   - Auto-rebuilds on save
 *   - Live-reloads browser via SSE
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync, watch } from 'fs';
import { resolve, dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILD_SCRIPT = resolve(__dirname, 'build.mjs');

// ─── Args ───
const args = process.argv.slice(2);
if (args.length < 1 || args[0] === '--help') {
  console.log('Usage: node dev.mjs <course-dir> [--port 3000]');
  process.exit(1);
}

let courseDir = resolve(args[0]);
if (!statSync(courseDir, { throwIfNoEntry: false })?.isDirectory()) {
  if (args[0].endsWith('.md')) courseDir = dirname(resolve(args[0]));
}

let port = 3000;
const portIdx = args.indexOf('--port');
if (portIdx !== -1 && args[portIdx + 1]) port = parseInt(args[portIdx + 1], 10);

// ─── Build helper ───
function runBuild() {
  try {
    execFileSync(process.execPath, [BUILD_SCRIPT, courseDir], { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error('⚠️  Build failed, waiting for next save...');
    return false;
  }
}

// ─── SSE clients ───
const sseClients = new Set();

const LIVE_RELOAD_SNIPPET = `
<!-- dev server live reload -->
<script>
(function(){
  var es = new EventSource('/__sse');
  es.onmessage = function(e){ if(e.data==='reload') location.reload(); };
  es.onerror = function(){ setTimeout(function(){ location.reload(); }, 2000); };
})();
</script>
</body>`;

// ─── HTTP server ───
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
};

const server = createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${port}`);
  const pathname = parsedUrl.pathname;

  // SSE endpoint
  if (pathname === '/__sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Static files serving
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  let filePath = join(courseDir, reqPath);

  // Fallback to global config or parent folder assets if needed
  if (!existsSync(filePath)) {
    filePath = join(courseDir, '..', reqPath); // check parent dir assets
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    if (ext === '.html') {
      let html = readFileSync(filePath, 'utf-8');
      html = html.replace('</body>', LIVE_RELOAD_SNIPPET);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(html);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(readFileSync(filePath));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

// ─── Watch files and trigger reload ───
let watchTimeout;
function notifyReload() {
  console.log('🔄 Reloading browser...');
  for (const client of sseClients) {
    client.write('data: reload\n\n');
  }
}

function handleFileChange() {
  clearTimeout(watchTimeout);
  watchTimeout = setTimeout(() => {
    console.log('👀 File change detected, rebuilding...');
    if (runBuild()) {
      notifyReload();
    }
  }, 100);
}

// Watch course directory
watch(courseDir, { recursive: true }, (event, filename) => {
  if (filename && (filename.endsWith('.md') || filename.endsWith('.yaml') || filename.endsWith('.yml') || filename.endsWith('.html'))) {
    if (filename.includes('index.html')) return; // ignore output build file
    handleFileChange();
  }
});

// Watch base template directory
const referenceDir = resolve(__dirname, '../reference');
watch(referenceDir, { recursive: true }, (event, filename) => {
  if (filename && filename.endsWith('.html')) {
    handleFileChange();
  }
});

// ─── Start Dev Server ───
runBuild();
server.listen(port, () => {
  console.log(`\n🚀 Dev Server started: http://localhost:${port}`);
  console.log(`   Watching: ${courseDir}`);
  console.log(`   Template: ${referenceDir}`);
});
