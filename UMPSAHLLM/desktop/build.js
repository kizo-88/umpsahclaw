const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    if (exists) fs.copyFileSync(src, dest);
  }
}

console.log('Copying backend...');
copyRecursiveSync(path.join(__dirname, '../backend'), path.join(__dirname, 'backend'));

console.log('Copying frontend dist...');
copyRecursiveSync(path.join(__dirname, '../frontend/dist'), path.join(__dirname, 'frontend/dist'));

console.log('Packaging app...');
execSync('npx electron-packager . UMPSAHLLM --platform=win32 --arch=x64 --out=release --overwrite --ignore="release|build\\.js"', { stdio: 'inherit' });
console.log('Done!');
