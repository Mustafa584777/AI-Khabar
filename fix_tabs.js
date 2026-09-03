const fs = require('fs');
let content = fs.readFileSync('components/public/UserDashboard.tsx', 'utf8');

const replacement = `        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('saved')}
            className={\`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 \${
              activeTab === 'saved'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }\`}
          >
            <span>Saved Pins</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={\`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 \${
              activeTab === 'history'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }\`}
          >
            <span>AI History</span>
          </button>
          <button
            onClick={() => setActiveTab('my-requested')}
            className={\`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 \${
              activeTab === 'my-requested'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }\`}
          >
            <span>My Requests</span>
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={\`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 \${
              activeTab === 'request'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }\`}
          >
            <span>Request a Prompt</span>
          </button>
          <button
            onClick={() => setActiveTab('taste')}
            className={\`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 \${
              activeTab === 'taste'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }\`}
          >
            <span>AI Taste Preferences</span>
          </button>
        </div>`;

content = content.replace(/<div className="max-w-7xl mx-auto flex items-center justify-between">[\s\S]*?<span>AI Taste Preferences<\/span>\s*<\/button>\s*<\/div>/, replacement);

fs.writeFileSync('components/public/UserDashboard.tsx', content);
