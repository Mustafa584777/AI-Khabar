const fs = require('fs');
let content = fs.readFileSync('app/api/gemini/generate/route.ts', 'utf8');

const newInstruction = `You are a helpful AI prompt engineer.
Your job is to generate high-quality AI image generation prompts for Midjourney, ChatGPT, etc.
Provide a structured JSON output as requested.
\${customIns ? \`\\nUSER CUSTOM SYSTEM INSTRUCTIONS:\\n\${customIns}\` : ''}`;

content = content.replace(/const systemInstruction = \`[\s\S]*?\}?\`;/, "const systemInstruction = `" + newInstruction + "`;");

fs.writeFileSync('app/api/gemini/generate/route.ts', content);
