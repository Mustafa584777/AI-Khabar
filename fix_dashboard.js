const fs = require('fs');
let content = fs.readFileSync('components/public/UserDashboard.tsx', 'utf8');

// 1. Remove leaderboard tab button
content = content.replace(/<button[\s\S]*?onClick=\{\(\) => setActiveTab\('leaderboard'\)\}[\s\S]*?<\/button>/, '');

// 2. Remove leaderboard block
content = content.replace(/\{\/\* TAB 5: Points Leaderboard \*\/\}[\s\S]*?\}\)/, '');

// 3. Replace the activeTab type
content = content.replace(/useState<'saved' \| 'history' \| 'my-requested' \| 'taste' \| 'request' \| 'leaderboard'>/g, "useState<'saved' | 'history' | 'my-requested' | 'taste' | 'request'>");
content = content.replace(/tab === 'taste' \|\| tab === 'leaderboard'/g, "tab === 'taste'");

// 4. Remove points in header
content = content.replace(/<div className="flex items-center gap-4">[\s\S]*?text-neutral-500 font-medium">Earned Points<\/div>\s*<\/div>\s*<\/div>/, '');

// 5. Remove Live Interaction Points block
content = content.replace(/\{\/\* Live Interaction Points \*\/\}[\s\S]*?<\/form>\s*<\/div>\s*<\/div>/, '');

fs.writeFileSync('components/public/UserDashboard.tsx', content);
