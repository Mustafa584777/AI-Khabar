const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'gemini-3\.6-flash'/g, "'gemini-1.5-pro'");
  content = content.replace(/'gemini-3\.5-flash'/g, "'gemini-1.5-flash'");
  content = content.replace(/'gemini-3\.1-flash-lite'/g, "'gemini-1.5-flash-8b'");
  content = content.replace(/'gemini-3\.7-flash'/g, "'gemini-2.0-flash'");
  content = content.replace(/'gemini-flash-latest'/g, "'gemini-2.5-flash'");
  fs.writeFileSync(file, content);
}

fix('app/api/gemini/generate/route.ts');
fix('app/api/gemini/tools/route.ts');
