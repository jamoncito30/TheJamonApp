const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const jsDistDir = path.join(distDir, 'js');

// Create dist directories
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(jsDistDir, { recursive: true });

// Files to copy to dist
const filesToCopy = [
  'index.html',
  'styles.css',
  'jamon_logo.jpg',
  'manifest.json',
  'sw.js',
  'server.js'
];

filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, file));
    console.log(`Copied ${file} -> dist/${file}`);
  }
});

// JS Files
const jsFiles = [
  'supabaseClient.js',
  'storage.js',
  'syllabusParser.js',
  'components.js',
  'app.js'
];

jsFiles.forEach(file => {
  const src = path.join(__dirname, 'js', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(jsDistDir, file));
    console.log(`Copied js/${file} -> dist/js/${file}`);
  }
});

console.log('\n✨ Build completed! Production folder generated at dist/');
