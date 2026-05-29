const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('C:\\\\.Developer\\\\UMPSAHCLAW\\\\UMPSAHLLM\\\\frontend\\\\src\\\\components', (filePath) => {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Minimalist Replacements
    content = content.replace(/bg-slate-900\/80/g, 'bg-black/20 backdrop-blur-xl');
    content = content.replace(/bg-slate-900/g, 'bg-black/30');
    content = content.replace(/bg-slate-950\/80/g, 'bg-black/40');
    content = content.replace(/bg-slate-950/g, 'bg-black/40');
    content = content.replace(/border-slate-800/g, 'border-white/5');
    content = content.replace(/border-slate-700/g, 'border-white/10');
    content = content.replace(/rounded-2xl/g, 'rounded-xl');
    content = content.replace(/shadow-xl/g, 'shadow-2xl shadow-black/50');
    content = content.replace(/bg-black border-white\/5/g, 'bg-black/60 border-white/5'); // Target web terminal black
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Updated ' + filePath);
    }
  }
});
