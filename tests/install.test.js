const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');

const {
  expandTilde,
  buildHookCommand,
  getDirName,
  processAttribution,
  convertToolName,
  convertGeminiToolName,
  stripSubTags,
  convertClaudeToGeminiToml,
  convertClaudeToOpencodeFrontmatter,
  convertClaudeToGeminiAgent,
  colorNameToHex,
  claudeToOpencodeTools,
  claudeToGeminiTools,
} = require('../bin/install.js');

// ─── expandTilde ───

describe('expandTilde', () => {
  it('expands ~ to home directory', () => {
    const result = expandTilde('~/my-project');
    assert.equal(result, path.join(os.homedir(), 'my-project'));
  });

  it('leaves absolute paths unchanged', () => {
    const abs = '/usr/local/bin';
    assert.equal(expandTilde(abs), abs);
  });

  it('leaves relative paths unchanged', () => {
    assert.equal(expandTilde('relative/path'), 'relative/path');
  });

  it('handles null/undefined gracefully', () => {
    assert.equal(expandTilde(null), null);
    assert.equal(expandTilde(undefined), undefined);
  });

  it('only expands ~/ at the start, not standalone ~', () => {
    assert.equal(expandTilde('~'), '~');
  });
});

// ─── buildHookCommand ───

describe('buildHookCommand', () => {
  it('builds a node command with forward slashes', () => {
    const result = buildHookCommand('/home/user/.claude', 'renn-statusline.js');
    assert.equal(result, 'node "/home/user/.claude/hooks/renn-statusline.js"');
  });

  it('converts Windows backslashes to forward slashes', () => {
    const result = buildHookCommand('C:\\Users\\user\\.claude', 'renn-statusline.js');
    assert.equal(result, 'node "C:/Users/user/.claude/hooks/renn-statusline.js"');
  });
});

// ─── getDirName ───

describe('getDirName', () => {
  it('returns .claude for claude runtime', () => {
    assert.equal(getDirName('claude'), '.claude');
  });

  it('returns .opencode for opencode runtime', () => {
    assert.equal(getDirName('opencode'), '.opencode');
  });

  it('returns .gemini for gemini runtime', () => {
    assert.equal(getDirName('gemini'), '.gemini');
  });

  it('defaults to .claude for unknown runtime', () => {
    assert.equal(getDirName('unknown'), '.claude');
  });
});

// ─── processAttribution ───

describe('processAttribution', () => {
  const content = 'Some commit message\n\nCo-Authored-By: Claude <noreply@anthropic.com>';

  it('removes Co-Authored-By when attribution is null', () => {
    const result = processAttribution(content, null);
    assert.ok(!result.includes('Co-Authored-By'));
  });

  it('keeps content unchanged when attribution is undefined', () => {
    const result = processAttribution(content, undefined);
    assert.equal(result, content);
  });

  it('replaces Co-Authored-By with custom attribution', () => {
    const result = processAttribution(content, 'Custom Bot <bot@example.com>');
    assert.ok(result.includes('Co-Authored-By: Custom Bot <bot@example.com>'));
    assert.ok(!result.includes('Claude'));
  });

  it('handles content without Co-Authored-By', () => {
    const noCoAuthor = 'Just a plain message';
    assert.equal(processAttribution(noCoAuthor, null), noCoAuthor);
    assert.equal(processAttribution(noCoAuthor, undefined), noCoAuthor);
  });

  it('escapes dollar signs in custom attribution', () => {
    const result = processAttribution(content, 'Bot $pecial <bot@test.com>');
    assert.ok(result.includes('$pecial'));
  });
});

// ─── convertToolName (Claude → OpenCode) ───

describe('convertToolName', () => {
  it('maps known Claude tools to OpenCode equivalents', () => {
    assert.equal(convertToolName('AskUserQuestion'), 'question');
    assert.equal(convertToolName('SlashCommand'), 'skill');
    assert.equal(convertToolName('TodoWrite'), 'todowrite');
    assert.equal(convertToolName('WebFetch'), 'webfetch');
    assert.equal(convertToolName('WebSearch'), 'websearch');
  });

  it('passes through MCP tools unchanged', () => {
    assert.equal(convertToolName('mcp__github__create_issue'), 'mcp__github__create_issue');
  });

  it('lowercases unknown tools', () => {
    assert.equal(convertToolName('Read'), 'read');
    assert.equal(convertToolName('Write'), 'write');
    assert.equal(convertToolName('Bash'), 'bash');
  });
});

// ─── convertGeminiToolName (Claude → Gemini) ───

describe('convertGeminiToolName', () => {
  it('maps known Claude tools to Gemini equivalents', () => {
    assert.equal(convertGeminiToolName('Read'), 'read_file');
    assert.equal(convertGeminiToolName('Write'), 'write_file');
    assert.equal(convertGeminiToolName('Edit'), 'replace');
    assert.equal(convertGeminiToolName('Bash'), 'run_shell_command');
    assert.equal(convertGeminiToolName('Glob'), 'glob');
    assert.equal(convertGeminiToolName('Grep'), 'search_file_content');
    assert.equal(convertGeminiToolName('WebSearch'), 'google_web_search');
  });

  it('returns null for MCP tools', () => {
    assert.equal(convertGeminiToolName('mcp__github__something'), null);
  });

  it('returns null for Task tool', () => {
    assert.equal(convertGeminiToolName('Task'), null);
  });

  it('lowercases unknown tools', () => {
    assert.equal(convertGeminiToolName('SomeNewTool'), 'somenewtool');
  });
});

// ─── stripSubTags ───

describe('stripSubTags', () => {
  it('converts <sub> tags to italic parenthetical', () => {
    assert.equal(stripSubTags('Hello <sub>world</sub>'), 'Hello *(world)*');
  });

  it('handles multiple sub tags', () => {
    assert.equal(stripSubTags('<sub>one</sub> and <sub>two</sub>'), '*(one)* and *(two)*');
  });

  it('leaves content without sub tags unchanged', () => {
    assert.equal(stripSubTags('No tags here'), 'No tags here');
  });
});

// ─── convertClaudeToGeminiToml ───

describe('convertClaudeToGeminiToml', () => {
  it('converts content without frontmatter to just a prompt', () => {
    const result = convertClaudeToGeminiToml('Just some instructions');
    assert.equal(result, 'prompt = "Just some instructions"\n');
  });

  it('extracts description from frontmatter', () => {
    const content = '---\nname: renn.test\ndescription: A test command\n---\nDo the thing';
    const result = convertClaudeToGeminiToml(content);
    assert.ok(result.includes('description = "A test command"'));
    assert.ok(result.includes('prompt = "Do the thing"'));
  });

  it('handles frontmatter without description', () => {
    const content = '---\nname: renn.test\n---\nDo the thing';
    const result = convertClaudeToGeminiToml(content);
    assert.ok(!result.includes('description'));
    assert.ok(result.includes('prompt = "Do the thing"'));
  });
});

// ─── convertClaudeToOpencodeFrontmatter ───

describe('convertClaudeToOpencodeFrontmatter', () => {
  it('replaces Claude tool names with OpenCode equivalents', () => {
    const content = 'Use AskUserQuestion to ask the user';
    const result = convertClaudeToOpencodeFrontmatter(content);
    assert.ok(result.includes('question'));
    assert.ok(!result.includes('AskUserQuestion'));
  });

  it('replaces /renn. with /renn- for flat command structure', () => {
    const content = 'Run /renn.run-stage to start';
    const result = convertClaudeToOpencodeFrontmatter(content);
    assert.ok(result.includes('/renn-run-stage'));
    assert.ok(!result.includes('/renn.run-stage'));
  });

  it('replaces ~/.claude with ~/.config/opencode', () => {
    const content = 'Files are in ~/.claude/renn/workflows/';
    const result = convertClaudeToOpencodeFrontmatter(content);
    assert.ok(result.includes('~/.config/opencode/renn/workflows/'));
    assert.ok(!result.includes('~/.claude'));
  });

  it('removes name field from frontmatter', () => {
    const content = '---\nname: renn-test\ndescription: Test agent\ntools: Read, Write\n---\nBody';
    const result = convertClaudeToOpencodeFrontmatter(content);
    assert.ok(!result.match(/^name:/m));
    assert.ok(result.includes('description'));
  });

  it('converts color names to hex', () => {
    const content = '---\ndescription: Test\ncolor: yellow\n---\nBody';
    const result = convertClaudeToOpencodeFrontmatter(content);
    assert.ok(result.includes(colorNameToHex.yellow));
  });

  it('converts tools field to key: true format', () => {
    const content = '---\ndescription: Test\ntools: Read, Write, Bash\n---\nBody';
    const result = convertClaudeToOpencodeFrontmatter(content);
    assert.ok(result.includes('read: true'));
    assert.ok(result.includes('write: true'));
    assert.ok(result.includes('bash: true'));
  });

  it('returns content unchanged when no frontmatter', () => {
    const content = 'Just plain content';
    assert.equal(convertClaudeToOpencodeFrontmatter(content), content);
  });
});

// ─── convertClaudeToGeminiAgent ───

describe('convertClaudeToGeminiAgent', () => {
  it('converts tools to Gemini format', () => {
    const content =
      '---\nname: renn-test\ndescription: Test\ntools: Read, Write, Bash\ncolor: yellow\n---\nBody text';
    const result = convertClaudeToGeminiAgent(content);
    assert.ok(result.includes('read_file'));
    assert.ok(result.includes('write_file'));
    assert.ok(result.includes('run_shell_command'));
  });

  it('removes color field', () => {
    const content = '---\nname: renn-test\ndescription: Test\ncolor: yellow\n---\nBody';
    const result = convertClaudeToGeminiAgent(content);
    assert.ok(!result.includes('color:'));
  });

  it('filters out unsupported tools (MCP, Task)', () => {
    const content =
      '---\nname: renn-test\ndescription: Test\ntools: Read, Task, mcp__github__test\n---\nBody';
    const result = convertClaudeToGeminiAgent(content);
    assert.ok(result.includes('read_file'));
    assert.ok(!result.includes('task'));
    assert.ok(!result.includes('mcp__'));
  });

  it('strips <sub> tags in body', () => {
    const content = '---\ndescription: Test\n---\nHello <sub>world</sub>';
    const result = convertClaudeToGeminiAgent(content);
    assert.ok(result.includes('*(world)*'));
    assert.ok(!result.includes('<sub>'));
  });

  it('returns content unchanged when no frontmatter', () => {
    const content = 'Just plain text';
    assert.equal(convertClaudeToGeminiAgent(content), content);
  });
});

// ─── Mapping completeness ───

describe('tool mapping completeness', () => {
  it('claudeToOpencodeTools has expected entries', () => {
    assert.ok(Object.keys(claudeToOpencodeTools).length >= 4);
    assert.equal(claudeToOpencodeTools.AskUserQuestion, 'question');
  });

  it('claudeToGeminiTools has expected entries', () => {
    assert.ok(Object.keys(claudeToGeminiTools).length >= 8);
    assert.equal(claudeToGeminiTools.Read, 'read_file');
    assert.equal(claudeToGeminiTools.Bash, 'run_shell_command');
  });
});
