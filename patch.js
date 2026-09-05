const fs = require('fs');
let code = fs.readFileSync('app/api/gemini/generate/route.ts', 'utf8');
code = code.replace(
  /\$\{customIns \? \\\`\\\\nUSER CUSTOM SYSTEM INSTRUCTIONS & GUIDELINES:\\\\n\$\{customIns\}\\\` : ''\}`;/,
  "${customIns ? `\\nUSER CUSTOM SYSTEM INSTRUCTIONS & GUIDELINES:\\n${customIns}` : ''}`;"
);
fs.writeFileSync('app/api/gemini/generate/route.ts', code);
