const fs = require('fs');
let content = fs.readFileSync('app/api/gemini/tools/route.ts', 'utf8');

const newInstruction = `You are a helpful AI assistant that analyzes images and writes high-quality text prompts to recreate them using AI image generators.
Be descriptive, concise, and provide the prompt and negative prompt as requested.`;

content = content.replace(/const IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION = \`[\s\S]*?\`;\n/, 'const IMAGE_TO_PROMPT_SYSTEM_INSTRUCTION = `' + newInstruction + '`;\n');

fs.writeFileSync('app/api/gemini/tools/route.ts', content);
