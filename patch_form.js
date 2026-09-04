const fs = require('fs');
let content = fs.readFileSync('components/public/UserDashboard.tsx', 'utf8');

const newForm = `            {/* Submit Prompt Request */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Submit Prompt Request
              </h4>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <textarea
                  required
                  rows={3}
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  placeholder="Describe what you want to see... e.g. A futuristic cyberpunk city with neon lights..."
                  className="w-full p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!requestText.trim() || isSubmittingRequest}
                  className="px-6 py-3 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center gap-2"
                >
                  <span>Submit Prompt Request</span>
                </button>
              </form>
            </div>
`;

content = content.replace(/\{\/\* User's Previous Requests \*\/\}/, newForm + '\n            {/* User\'s Previous Requests */}');
fs.writeFileSync('components/public/UserDashboard.tsx', content);
