#!/usr/bin/env node
// Claude Code Statusline - ACE Edition
// Shows: model | current task | directory | context usage

const fs = require('fs');
const path = require('path');
const os = require('os');

// Read JSON from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;

    // Context window display (shows USED percentage scaled to 80% limit)
    let ctx = '';
    if (remaining != null) {
      const rem = Math.round(remaining);
      const rawUsed = Math.max(0, Math.min(100, 100 - rem));
      const used = Math.min(100, Math.round((rawUsed / 80) * 100));

      const filled = Math.floor(used / 10);
      const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);

      if (used < 63) {
        ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      } else if (used < 81) {
        ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      } else if (used < 95) {
        ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m\ud83d\udc80 ${bar} ${used}%\x1b[0m`;
      }
    }

    // Current task from todos
    let task = '';
    const homeDir = os.homedir();
    const todosDir = path.join(homeDir, '.claude', 'todos');
    if (session && fs.existsSync(todosDir)) {
      try {
        const files = fs
          .readdirSync(todosDir)
          .filter((f) => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
          .map((f) => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          try {
            const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
            const inProgress = todos.find((t) => t.status === 'in_progress');
            if (inProgress) task = inProgress.activeForm || '';
          } catch (_e) {
            /* ignore parse errors */
          }
        }
      } catch (_e) {
        // Silently fail on file system errors
      }
    }

    // ACE update available?
    let aceUpdate = '';
    const cacheFile = path.join(homeDir, '.claude', 'cache', 'ace-update-check.json');
    if (fs.existsSync(cacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cache.update_available) {
          aceUpdate = '\x1b[33m\u2b06 ACE update\x1b[0m \u2502 ';
        }
      } catch (_e) {
        /* ignore parse errors */
      }
    }

    // Output
    const dirname = path.basename(dir);
    if (task) {
      process.stdout.write(
        `${aceUpdate}\x1b[2m${model}\x1b[0m \u2502 \x1b[1m${task}\x1b[0m \u2502 \x1b[2m${dirname}\x1b[0m${ctx}`
      );
    } else {
      process.stdout.write(
        `${aceUpdate}\x1b[2m${model}\x1b[0m \u2502 \x1b[2m${dirname}\x1b[0m${ctx}`
      );
    }
  } catch (_e) {
    // Silent fail
  }
});
