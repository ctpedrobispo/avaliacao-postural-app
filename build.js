// Gera um único arquivo HTML com os scripts embutidos (para publicar como página única).
// Uso: node apps/avaliacao-postural/build.js  →  apps/avaliacao-postural/dist/avaliacao-postural.html
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'app');
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
html = html.replace(/<link rel="manifest"[^>]*>\n/, '');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>${fs.readFileSync(path.join(dir, f), 'utf8').replace(/<\/script/g, '<\\/script')}</script>`);
html = html.replace('<script>', '<script>window.__SINGLE_FILE__ = true;</script>\n<script>');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'avaliacao-postural.html'), html);
console.log('dist/avaliacao-postural.html', html.length, 'bytes');
