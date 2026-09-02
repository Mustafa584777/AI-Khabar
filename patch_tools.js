const fs = require('fs');
let code = fs.readFileSync('app/api/gemini/tools/route.ts', 'utf8');
code = code.replace(
  /- Never use generic placeholder brackets like \[subject\], \[clothing\], \[lighting\], \[camera_lens\], or \[location\]\. Every single detail must be written out concretely\./,
  '- Every prompt MUST be written as a template utilizing [bracketed variables] for the user to fill in themselves (e.g. [subject], [location], [time_of_day], [colors]).'
);
fs.writeFileSync('app/api/gemini/tools/route.ts', code);
