import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  // 默认打开 index.html
  let url = req.url === '/' ? '/prototype/index.html' : req.url;
  const filePath = path.join(__dirname, url);

  // 安全检查：不允许跳出项目目录
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🎈 气球大乱踩 — 开发服务器\n`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://localhost:${PORT}/prototype/index.html\n`);
  console.log(`  Ctrl+C 停止\n`);
});
