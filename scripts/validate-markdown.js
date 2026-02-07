#!/usr/bin/env node

/**
 * ACE Markdown Validator
 *
 * Validates structural correctness of ACE markdown files:
 * - YAML frontmatter schema (commands and agents)
 * - Required sections per file type
 * - Semantic XML tag closure
 * - @-reference existence
 * - Naming conventions
 *
 * Usage:
 *   node scripts/validate-markdown.js                    # Validate all
 *   node scripts/validate-markdown.js path/to/file.md    # Validate specific files
 *
 * Exit code 0 = all valid, 1 = errors found
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
let filesChecked = 0;

// ─── File type detection ───

function getFileType(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (rel.startsWith('commands/')) return 'command';
  if (rel.startsWith('agents/')) return 'agent';
  if (rel.startsWith('ace/workflows/')) return 'workflow';
  if (rel.startsWith('ace/references/')) return 'reference';
  if (rel.startsWith('ace/templates/')) return 'template';
  return null; // Not an ACE structural file
}

// ─── YAML frontmatter parsing ───

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const fields = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let inList = false;
  let listItems = [];

  for (const line of lines) {
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (kvMatch) {
      if (inList && currentKey) {
        fields[currentKey] = listItems;
        listItems = [];
        inList = false;
      }
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value === '') {
        inList = true;
        listItems = [];
      } else {
        fields[currentKey] = value;
      }
    } else if (inList && line.match(/^\s+-\s+(.*)/)) {
      listItems.push(line.match(/^\s+-\s+(.*)/)[1].trim());
    }
  }
  if (inList && currentKey) {
    fields[currentKey] = listItems;
  }

  return fields;
}

function hasFrontmatter(content) {
  return /^---\r?\n/.test(content);
}

// ─── Validation rules per file type ───

const COMMAND_REQUIRED_FRONTMATTER = ['name', 'description', 'allowed-tools'];
const COMMAND_REQUIRED_SECTIONS = ['<objective>', '<process>', '<success_criteria>'];

const AGENT_REQUIRED_FRONTMATTER = ['name', 'description', 'tools'];
const AGENT_REQUIRED_SECTIONS = [
  '<role>',
  ['<execution_flow>', '<verification_process>', '<process>'],
  '<success_criteria>',
];

const WORKFLOW_REQUIRED_SECTIONS = ['<purpose>'];

// Known XML tags that must be closed
const CLOSEABLE_TAGS = [
  'objective',
  'execution_context',
  'context',
  'process',
  'success_criteria',
  'role',
  'execution_flow',
  'step',
  'purpose',
  'core_principle',
  'overview',
  'required_reading',
  'task',
  'name',
  'files',
  'action',
  'verify',
  'done',
  'lifecycle',
  'size_constraint',
];

// ─── Validators ───

function validateCommand(filePath, content) {
  const fm = extractFrontmatter(content);

  if (!fm) {
    errors.push(`${filePath}: Command file missing YAML frontmatter`);
    return;
  }

  for (const field of COMMAND_REQUIRED_FRONTMATTER) {
    if (!fm[field]) {
      errors.push(`${filePath}: Missing required frontmatter field: ${field}`);
    }
  }

  if (fm.name && !/^ace\.[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(fm.name)) {
    errors.push(`${filePath}: Command name "${fm.name}" must match ace.kebab-case`);
  }

  for (const section of COMMAND_REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push(`${filePath}: Missing required section: ${section}`);
    }
  }
}

function validateAgent(filePath, content) {
  const fm = extractFrontmatter(content);

  if (!fm) {
    errors.push(`${filePath}: Agent file missing YAML frontmatter`);
    return;
  }

  for (const field of AGENT_REQUIRED_FRONTMATTER) {
    if (!fm[field]) {
      errors.push(`${filePath}: Missing required frontmatter field: ${field}`);
    }
  }

  if (fm.name && !/^ace-[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(fm.name)) {
    errors.push(`${filePath}: Agent name "${fm.name}" must match ace-kebab`);
  }

  for (const section of AGENT_REQUIRED_SECTIONS) {
    const alternatives = Array.isArray(section) ? section : [section];
    const found = alternatives.some((s) => content.includes(s));
    if (!found) {
      errors.push(`${filePath}: Missing required section: ${alternatives[0]}`);
    }
  }
}

function validateWorkflow(filePath, content) {
  if (hasFrontmatter(content)) {
    errors.push(`${filePath}: Workflow files must NOT have YAML frontmatter`);
  }

  for (const section of WORKFLOW_REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      warnings.push(`${filePath}: Missing recommended section: ${section}`);
    }
  }
}

function validateReference(filePath, content) {
  if (hasFrontmatter(content)) {
    errors.push(`${filePath}: Reference files must NOT have YAML frontmatter`);
  }
}

function validateTemplate(filePath, content) {
  if (hasFrontmatter(content)) {
    errors.push(`${filePath}: Template files must NOT have YAML frontmatter`);
  }
}

// ─── Cross-cutting validators (all file types) ───

function validateXmlTagClosure(filePath, content) {
  // Strip fenced code blocks and inline backtick code
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');

  for (const tag of CLOSEABLE_TAGS) {
    // Only match opening tags at line start (ignores prose/documentation references)
    const openPattern = new RegExp(`^[ \\t]*<${tag}[\\s>]`, 'gm');
    const closePattern = new RegExp(`</${tag}>`, 'g');

    const openCount = (stripped.match(openPattern) || []).length;
    const closeCount = (stripped.match(closePattern) || []).length;

    if (openCount > closeCount) {
      errors.push(`${filePath}: Unclosed <${tag}> tag (${openCount} opened, ${closeCount} closed)`);
    }
  }
}

function validateStepNames(filePath, content) {
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const stepNamePattern = /<step\s[^>]*name="([^"]+)"/g;
  let match;
  while ((match = stepNamePattern.exec(stripped)) !== null) {
    const name = match[1];
    if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name)) {
      errors.push(`${filePath}: Step name "${name}" must be snake_case`);
    }
  }
}

function validateCrossReferences(filePath, content) {
  const refPattern = /@~\/\.claude\/([^\s)]+\.md)/g;
  let match;
  while ((match = refPattern.exec(content)) !== null) {
    const refPath = match[1];
    const localPath = path.join(ROOT, refPath);
    if (!fs.existsSync(localPath)) {
      warnings.push(`${filePath}: @-reference "${match[0]}" — file not found in project`);
    }
  }
}

// ─── Content-level validators ───

function validateReferenceFormat(filePath, content) {
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const lines = stripped.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Flag bare relative @-references to ace framework paths
    const bareRelative = line.match(
      /@(?:\.\.?\/|)(?:ace\/(?:workflows|references|templates)\/[^\s)]+)/g
    );
    if (bareRelative) {
      for (const ref of bareRelative) {
        if (!ref.includes('~/.claude/')) {
          errors.push(
            `${filePath}:${lineNum}: Bad @-reference "${ref}" — must use @~/.claude/ace/... prefix`
          );
        }
      }
    }
  }
}

function validateArgumentsUsage(filePath, content, fileType) {
  if (fileType !== 'command') return;

  const fm = extractFrontmatter(content);
  if (!fm || !fm['argument-hint']) return;

  const contextMatch = content.match(/<context>([\s\S]*?)<\/context>/);
  if (!contextMatch) {
    errors.push(`${filePath}: Has argument-hint but no <context> section to read $ARGUMENTS`);
    return;
  }

  if (!contextMatch[1].includes('$ARGUMENTS')) {
    errors.push(
      `${filePath}: Has argument-hint "${fm['argument-hint']}" but <context> never reads $ARGUMENTS`
    );
  }
}

function validateBannedTerminology(filePath, content) {
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const lines = stripped.split('\n');

  const bannedTerms = [{ term: 'recon', replacement: 'research', pattern: /\brecon\b/gi }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const { term, replacement, pattern } of bannedTerms) {
      if (pattern.test(line)) {
        errors.push(`${filePath}:${lineNum}: Banned term "${term}" — use "${replacement}" instead`);
        pattern.lastIndex = 0;
      }
    }
  }
}

function validateCommandSectionOrder(filePath, content, fileType) {
  if (fileType !== 'command') return;

  const orderedSections = [
    'objective',
    'execution_context',
    'context',
    'process',
    'success_criteria',
  ];

  let lastLine = -1;
  let lastSection = null;

  for (const section of orderedSections) {
    const match = content.match(new RegExp(`<${section}[\\s>]`));
    if (!match) continue;

    const lineNum = content.substring(0, match.index).split('\n').length;
    if (lastLine >= 0 && lineNum < lastLine) {
      warnings.push(
        `${filePath}: Section <${section}> (line ${lineNum}) appears before <${lastSection}> (line ${lastLine}) — expected order: objective → execution_context → context → process → success_criteria`
      );
      return;
    }
    lastLine = lineNum;
    lastSection = section;
  }
}

function validateAgentSectionOrder(filePath, content, fileType) {
  if (fileType !== 'agent') return;

  const orderedSections = ['role', 'execution_flow', 'success_criteria'];

  let lastLine = -1;
  let lastSection = null;

  for (const section of orderedSections) {
    const match = content.match(new RegExp(`<${section}[\\s>]`));
    if (!match) continue;

    const lineNum = content.substring(0, match.index).split('\n').length;
    if (lastLine >= 0 && lineNum < lastLine) {
      warnings.push(
        `${filePath}: Section <${section}> (line ${lineNum}) appears before <${lastSection}> (line ${lastLine}) — expected order: role → execution_flow → success_criteria`
      );
      return;
    }
    lastLine = lineNum;
    lastSection = section;
  }
}

function validateAgentCompletionMarkers(filePath, content, fileType) {
  if (fileType !== 'agent') return;

  const markers = ['RUN COMPLETE', 'GATE REACHED', 'CULPRIT FOUND', 'INVESTIGATION INCONCLUSIVE'];

  const hasMarker = markers.some((m) => content.includes(m));
  if (!hasMarker) {
    warnings.push(
      `${filePath}: No completion marker found — agents should reference at least one of: ${markers.join(', ')}`
    );
  }
}

function validateCommandDelegation(filePath, content, fileType) {
  if (fileType !== 'command') return;

  const lineCount = content.split('\n').length;
  if (lineCount <= 80) return;

  const hasWorkflowRef = /@~\/\.claude\/ace\/workflows\//.test(content);
  if (!hasWorkflowRef) {
    warnings.push(
      `${filePath}: Command is ${lineCount} lines with no workflow reference — consider delegating logic to a workflow`
    );
  }
}

function validateAgentFirstStep(filePath, content, fileType) {
  if (fileType !== 'agent') return;

  const flowMatch = content.match(/<execution_flow>([\s\S]*?)<\/execution_flow>/);
  if (!flowMatch) return;

  const firstStepMatch = flowMatch[1].match(
    /<step\s[^>]*name="([^"]*)"[^>]*>([\s\S]*?)(?:<\/step>|<step\s)/
  );
  if (!firstStepMatch) return;

  const stepName = firstStepMatch[1];
  const stepBody = firstStepMatch[2];

  const nameOk = /load|project_state/.test(stepName);
  const bodyOk = /pulse\.md/.test(stepBody);

  if (!nameOk && !bodyOk) {
    warnings.push(
      `${filePath}: First step "${stepName}" doesn't reference pulse.md — agents should load project state first`
    );
  }
}

function validateBannedPhrases(filePath, content) {
  // Strip code blocks and example tags, preserving line count for accurate line numbers
  let stripped = content.replace(/```[\s\S]*?```/g, (m) => '\n'.repeat(m.split('\n').length - 1));
  stripped = stripped.replace(/<example>[\s\S]*?<\/example>/g, (m) =>
    '\n'.repeat(m.split('\n').length - 1)
  );
  const lines = stripped.split('\n');

  const bannedPatterns = [
    { pattern: /^Let me\b/i, category: 'Filler' },
    { pattern: /^Just\s/i, category: 'Filler' },
    { pattern: /^Simply\s/i, category: 'Filler' },
    { pattern: /\bGreat!\b/, category: 'Sycophancy' },
    { pattern: /\bAwesome!\b/, category: 'Sycophancy' },
    { pattern: /\bPerfect!\b/, category: 'Sycophancy' },
    { pattern: /\bExcellent!\b/, category: 'Sycophancy' },
    { pattern: /\bWe changed\b/i, category: 'History language' },
    { pattern: /\bPreviously\b/i, category: 'History language' },
    { pattern: /\bNo longer\b/i, category: 'History language' },
    { pattern: /\bUsed to\b/i, category: 'History language' },
    { pattern: /\bWas renamed\b/i, category: 'History language' },
    { pattern: /\bstory points?\b/i, category: 'Enterprise language' },
    { pattern: /\bsprint\b/i, category: 'Enterprise language' },
    { pattern: /\bstandup\b/i, category: 'Enterprise language' },
    { pattern: /\bvelocity\b/i, category: 'Enterprise language' },
    { pattern: /\bretrospective\b/i, category: 'Enterprise language' },
    { pattern: /\b\d+\s*(hours?|days?|weeks?|minutes?)\b/i, category: 'Human time estimate' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lineNum = i + 1;

    for (const { pattern, category } of bannedPatterns) {
      if (pattern.test(line)) {
        const preview = line.length > 60 ? line.substring(0, 60) + '...' : line;
        warnings.push(`${filePath}:${lineNum}: ${category}: "${preview}"`);
      }
    }
  }
}

function validateTemplateStructure(filePath, content, fileType) {
  if (fileType !== 'template') return;

  const hasTemplateSection = /## File Template/i.test(content);
  if (!hasTemplateSection) {
    warnings.push(`${filePath}: Missing "## File Template" section`);
  }

  const guidanceTags = ['guidelines', 'purpose', 'lifecycle', 'one_liner_rules', 'size_constraint'];
  const hasGuidance = guidanceTags.some((tag) => content.includes(`<${tag}>`));
  if (!hasGuidance) {
    warnings.push(
      `${filePath}: No guidance section found — templates should have <purpose>, <lifecycle>, <guidelines>, or similar`
    );
  }
}

function validateTaskXmlStructure(filePath, content) {
  const stripped = content.replace(/```[\s\S]*?```/g, (m) => '\n'.repeat(m.split('\n').length - 1));

  const taskPattern = /<task\s[^>]*type="([^"]*)"[^>]*>([\s\S]*?)<\/task>/g;
  let match;

  while ((match = taskPattern.exec(stripped)) !== null) {
    const taskType = match[1];
    const taskBody = match[2];
    const lineNum = stripped.substring(0, match.index).split('\n').length;

    if (taskType === 'auto') {
      const required = ['name', 'action', 'verify', 'done'];
      for (const tag of required) {
        if (!taskBody.includes(`<${tag}>`)) {
          warnings.push(`${filePath}:${lineNum}: Task type="auto" missing <${tag}> element`);
        }
      }
    } else if (taskType === 'checkpoint:human-verify') {
      if (!taskBody.includes('<what-built>') && !taskBody.includes('<what_built>')) {
        warnings.push(
          `${filePath}:${lineNum}: Task type="checkpoint:human-verify" missing <what-built>`
        );
      }
      if (!taskBody.includes('<how-to-verify>') && !taskBody.includes('<how_to_verify>')) {
        warnings.push(
          `${filePath}:${lineNum}: Task type="checkpoint:human-verify" missing <how-to-verify>`
        );
      }
    }
  }
}

function validateBannedXmlTags(filePath, content) {
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const lines = stripped.split('\n');

  const bannedTags = ['section', 'item', 'content', 'header', 'body', 'list'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const tag of bannedTags) {
      const pattern = new RegExp(`<${tag}[\\s>]|</${tag}>`, 'i');
      if (pattern.test(line)) {
        errors.push(
          `${filePath}:${lineNum}: Banned generic XML tag <${tag}> — use a semantic name instead`
        );
      }
    }
  }
}

// ─── Main ───

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileType = getFileType(filePath);
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');

  if (!fileType) return;

  filesChecked++;

  switch (fileType) {
    case 'command':
      validateCommand(rel, content);
      break;
    case 'agent':
      validateAgent(rel, content);
      break;
    case 'workflow':
      validateWorkflow(rel, content);
      break;
    case 'reference':
      validateReference(rel, content);
      break;
    case 'template':
      validateTemplate(rel, content);
      break;
  }

  validateXmlTagClosure(rel, content);
  validateStepNames(rel, content);
  validateCrossReferences(rel, content);
  validateReferenceFormat(rel, content);
  validateArgumentsUsage(rel, content, fileType);
  validateBannedTerminology(rel, content);
  validateBannedXmlTags(rel, content);
  validateCommandSectionOrder(rel, content, fileType);
  validateAgentSectionOrder(rel, content, fileType);
  validateAgentCompletionMarkers(rel, content, fileType);
  validateAgentFirstStep(rel, content, fileType);
  validateCommandDelegation(rel, content, fileType);
  validateBannedPhrases(rel, content);
  validateTemplateStructure(rel, content, fileType);
  validateTaskXmlStructure(rel, content);
}

function collectFiles(dir, ext) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', '.internal'].includes(entry.name)) {
      results.push(...collectFiles(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

const args = process.argv.slice(2);
const filesToValidate =
  args.length > 0 ? args.filter((f) => f.endsWith('.md')) : collectFiles(ROOT, '.md');

for (const file of filesToValidate) {
  validateFile(path.resolve(file));
}

console.log(`\nACE Markdown Validator — ${filesChecked} files checked\n`);

if (warnings.length > 0) {
  console.log(`⚠ ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ${w}`);
  console.log('');
}

if (errors.length > 0) {
  console.log(`✗ ${errors.length} error(s):`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
} else {
  console.log('✓ All files valid');
}
