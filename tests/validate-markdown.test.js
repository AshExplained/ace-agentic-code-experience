const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  getFileType,
  extractFrontmatter,
  hasFrontmatter,
  validateCommand,
  validateAgent,
  validateWorkflow,
  validateReference,
  validateTemplate,
  validateXmlTagClosure,
  validateStepNames,
  validateReferenceFormat,
  validateArgumentsUsage,
  validateBannedTerminology,
  validateBannedXmlTags,
  validateCommandSectionOrder,
  validateAgentSectionOrder,
  validateAgentCompletionMarkers,
  validateAgentFirstStep,
  validateCommandDelegation,
  validateBannedPhrases,
  validateTemplateStructure,
  validateTaskXmlStructure,
  errors,
  warnings,
  _resetState,
} = require('../scripts/validate-markdown.js');

// ─── Helpers ───

/** Build a minimal valid command file */
function validCommand(overrides = '') {
  return `---
name: renn.test-cmd
description: A test command
allowed-tools:
  - Read
  - Write
---

<objective>
Do the thing.
</objective>

<process>
1. Step one
</process>

<success_criteria>
- [ ] Done
</success_criteria>
${overrides}`;
}

/** Build a minimal valid agent file */
function validAgent(overrides = '') {
  return `---
name: renn-test-agent
description: A test agent
tools: Read, Write, Bash
color: yellow
---

<role>
You are a test agent.
</role>

<execution_flow>

<step name="load_project_state" priority="first">
Read pulse.md
</step>

</execution_flow>

<success_criteria>
- [ ] Done
</success_criteria>

## RUN COMPLETE
${overrides}`;
}

// ─── Tests ───

describe('getFileType', () => {
  it('detects command files', () => {
    assert.equal(getFileType('commands/renn.help.md'), 'command');
  });

  it('detects agent files', () => {
    assert.equal(getFileType('agents/renn-runner.md'), 'agent');
  });

  it('detects workflow files', () => {
    assert.equal(getFileType('renn/workflows/run-stage.md'), 'workflow');
  });

  it('detects reference files', () => {
    assert.equal(getFileType('renn/references/drift-rules.md'), 'reference');
  });

  it('detects template files', () => {
    assert.equal(getFileType('renn/templates/pulse.md'), 'template');
  });

  it('returns null for unknown paths', () => {
    assert.equal(getFileType('random/file.md'), null);
    assert.equal(getFileType('README.md'), null);
  });

  it('normalizes Windows backslashes', () => {
    assert.equal(getFileType('commands\\renn.help.md'), 'command');
    assert.equal(getFileType('agents\\renn-runner.md'), 'agent');
  });
});

describe('extractFrontmatter', () => {
  it('parses key-value fields', () => {
    const fm = extractFrontmatter('---\nname: renn.test\ndescription: Hello\n---\nBody');
    assert.equal(fm.name, 'renn.test');
    assert.equal(fm.description, 'Hello');
  });

  it('parses list fields', () => {
    const fm = extractFrontmatter(
      '---\nname: renn.test\nallowed-tools:\n  - Read\n  - Write\n---\nBody'
    );
    assert.deepEqual(fm['allowed-tools'], ['Read', 'Write']);
  });

  it('returns null when no frontmatter', () => {
    assert.equal(extractFrontmatter('# Just a heading\nSome text'), null);
  });

  it('handles CRLF line endings', () => {
    const fm = extractFrontmatter('---\r\nname: renn.test\r\n---\r\nBody');
    assert.equal(fm.name, 'renn.test');
  });

  it('handles comma-separated tools field', () => {
    const fm = extractFrontmatter('---\ntools: Read, Write, Bash\n---\nBody');
    assert.equal(fm.tools, 'Read, Write, Bash');
  });
});

describe('hasFrontmatter', () => {
  it('returns true when content starts with ---', () => {
    assert.equal(hasFrontmatter('---\nname: test\n---'), true);
  });

  it('returns true with CRLF', () => {
    assert.equal(hasFrontmatter('---\r\nname: test\r\n---'), true);
  });

  it('returns false without frontmatter', () => {
    assert.equal(hasFrontmatter('# Heading\nContent'), false);
  });

  it('returns false for empty content', () => {
    assert.equal(hasFrontmatter(''), false);
  });
});

describe('validateCommand', () => {
  beforeEach(() => _resetState());

  it('accepts a valid command', () => {
    validateCommand('commands/renn.test.md', validCommand());
    assert.equal(errors.length, 0);
  });

  it('errors on missing frontmatter', () => {
    validateCommand('commands/renn.test.md', '# No frontmatter\n<objective>X</objective>');
    assert.equal(errors.length, 1);
    assert.match(errors[0], /missing YAML frontmatter/i);
  });

  it('errors on missing required fields', () => {
    validateCommand(
      'commands/renn.test.md',
      '---\nname: renn.test\n---\n<objective>X</objective>\n<process>X</process>\n<success_criteria>X</success_criteria>'
    );
    assert.ok(errors.some((e) => e.includes('description')));
    assert.ok(errors.some((e) => e.includes('allowed-tools')));
  });

  it('errors on bad name format', () => {
    const content = validCommand().replace('name: renn.test-cmd', 'name: bad_name');
    validateCommand('commands/renn.test.md', content);
    assert.ok(errors.some((e) => e.includes('must match renn.kebab-case')));
  });

  it('errors on missing required sections', () => {
    validateCommand(
      'commands/renn.test.md',
      '---\nname: renn.test\ndescription: X\nallowed-tools:\n  - Read\n---\nJust some text'
    );
    assert.ok(errors.some((e) => e.includes('<objective>')));
    assert.ok(errors.some((e) => e.includes('<process>')));
    assert.ok(errors.some((e) => e.includes('<success_criteria>')));
  });
});

describe('validateAgent', () => {
  beforeEach(() => _resetState());

  it('accepts a valid agent', () => {
    validateAgent('agents/renn-test.md', validAgent());
    assert.equal(errors.length, 0);
  });

  it('errors on missing frontmatter', () => {
    validateAgent('agents/renn-test.md', '# No frontmatter');
    assert.equal(errors.length, 1);
    assert.match(errors[0], /missing YAML frontmatter/i);
  });

  it('errors on bad name format', () => {
    const content = validAgent().replace('name: renn-test-agent', 'name: BadAgent');
    validateAgent('agents/renn-test.md', content);
    assert.ok(errors.some((e) => e.includes('must match renn-kebab')));
  });

  it('accepts alternative sections (verification_process)', () => {
    // Replace <execution_flow>...</execution_flow> with <verification_process>...</verification_process>
    const content = validAgent()
      .replace('<execution_flow>', '<verification_process>')
      .replace('</execution_flow>', '</verification_process>');
    validateAgent('agents/renn-test.md', content);
    const execFlowErrors = errors.filter((e) => e.includes('execution_flow'));
    assert.equal(execFlowErrors.length, 0);
  });

  it('accepts alternative sections (process)', () => {
    const content = validAgent()
      .replace('<execution_flow>', '<process>')
      .replace('</execution_flow>', '</process>');
    validateAgent('agents/renn-test.md', content);
    const execFlowErrors = errors.filter((e) => e.includes('execution_flow'));
    assert.equal(execFlowErrors.length, 0);
  });
});

describe('validateWorkflow', () => {
  beforeEach(() => _resetState());

  it('accepts a valid workflow', () => {
    validateWorkflow('renn/workflows/test.md', '<purpose>\nDo stuff\n</purpose>');
    assert.equal(errors.length, 0);
    assert.equal(warnings.length, 0);
  });

  it('errors when workflow has frontmatter', () => {
    validateWorkflow('renn/workflows/test.md', '---\nname: bad\n---\n<purpose>X</purpose>');
    assert.ok(errors.some((e) => e.includes('must NOT have YAML frontmatter')));
  });

  it('warns when missing <purpose>', () => {
    validateWorkflow('renn/workflows/test.md', '# Just a heading\nSome content');
    assert.ok(warnings.some((w) => w.includes('<purpose>')));
  });
});

describe('validateReference', () => {
  beforeEach(() => _resetState());

  it('accepts a reference without frontmatter', () => {
    validateReference('renn/references/test.md', '# Test Reference\nContent here');
    assert.equal(errors.length, 0);
  });

  it('errors when reference has frontmatter', () => {
    validateReference('renn/references/test.md', '---\nname: bad\n---\nContent');
    assert.ok(errors.some((e) => e.includes('must NOT have YAML frontmatter')));
  });
});

describe('validateTemplate', () => {
  beforeEach(() => _resetState());

  it('accepts a template without frontmatter', () => {
    validateTemplate('renn/templates/test.md', '# Test Template\nContent');
    assert.equal(errors.length, 0);
  });

  it('errors when template has frontmatter', () => {
    validateTemplate('renn/templates/test.md', '---\nname: bad\n---\nContent');
    assert.ok(errors.some((e) => e.includes('must NOT have YAML frontmatter')));
  });
});

describe('validateXmlTagClosure', () => {
  beforeEach(() => _resetState());

  it('accepts matched tags', () => {
    validateXmlTagClosure('test.md', '<objective>\nContent\n</objective>');
    assert.equal(errors.length, 0);
  });

  it('detects unclosed tags', () => {
    validateXmlTagClosure('test.md', '<objective>\nContent');
    assert.ok(errors.some((e) => e.includes('Unclosed <objective>')));
  });

  it('ignores tags inside code blocks', () => {
    validateXmlTagClosure('test.md', '```\n<objective>\nExample\n```');
    assert.equal(errors.length, 0);
  });

  it('handles multiple tag pairs', () => {
    validateXmlTagClosure('test.md', '<objective>\nA\n</objective>\n<process>\nB\n</process>');
    assert.equal(errors.length, 0);
  });

  it('detects one unclosed among multiple', () => {
    validateXmlTagClosure('test.md', '<objective>\nA\n</objective>\n<process>\nB');
    assert.ok(errors.some((e) => e.includes('Unclosed <process>')));
    // objective should be fine
    assert.ok(!errors.some((e) => e.includes('Unclosed <objective>')));
  });
});

describe('validateStepNames', () => {
  beforeEach(() => _resetState());

  it('accepts snake_case names', () => {
    validateStepNames('test.md', '<step name="load_project_state">');
    assert.equal(errors.length, 0);
  });

  it('rejects non-snake_case names', () => {
    validateStepNames('test.md', '<step name="loadProjectState">');
    assert.ok(errors.some((e) => e.includes('must be snake_case')));
  });

  it('accepts single word names', () => {
    validateStepNames('test.md', '<step name="load">');
    assert.equal(errors.length, 0);
  });

  it('ignores step tags inside code blocks', () => {
    validateStepNames('test.md', '```\n<step name="BadName">\n```');
    assert.equal(errors.length, 0);
  });
});

describe('validateReferenceFormat', () => {
  beforeEach(() => _resetState());

  it('accepts proper @~/.claude/ references', () => {
    validateReferenceFormat('test.md', '@~/.claude/renn/workflows/run-stage.md');
    assert.equal(errors.length, 0);
  });

  it('errors on bare relative @-references to renn paths', () => {
    validateReferenceFormat('test.md', '@renn/workflows/run-stage.md');
    assert.ok(errors.some((e) => e.includes('must use @~/.claude/renn/')));
  });

  it('ignores references inside code blocks', () => {
    validateReferenceFormat('test.md', '```\n@renn/workflows/run-stage.md\n```');
    assert.equal(errors.length, 0);
  });
});

describe('validateArgumentsUsage', () => {
  beforeEach(() => _resetState());

  it('passes when command has argument-hint and $ARGUMENTS in context', () => {
    const content = `---
name: renn.test
description: Test
argument-hint: "<stage>"
allowed-tools:
  - Read
---
<context>
$ARGUMENTS
</context>`;
    validateArgumentsUsage('test.md', content, 'command');
    assert.equal(errors.length, 0);
  });

  it('errors when argument-hint present but no $ARGUMENTS in context', () => {
    const content = `---
name: renn.test
description: Test
argument-hint: "<stage>"
allowed-tools:
  - Read
---
<context>
Something else
</context>`;
    validateArgumentsUsage('test.md', content, 'command');
    assert.ok(errors.some((e) => e.includes('$ARGUMENTS')));
  });

  it('errors when argument-hint present but no context section', () => {
    const content = `---
name: renn.test
description: Test
argument-hint: "<stage>"
allowed-tools:
  - Read
---
No context section here`;
    validateArgumentsUsage('test.md', content, 'command');
    assert.ok(errors.some((e) => e.includes('no <context> section')));
  });

  it('skips non-command files', () => {
    validateArgumentsUsage('test.md', 'anything', 'workflow');
    assert.equal(errors.length, 0);
  });

  it('skips commands without argument-hint', () => {
    const content = `---
name: renn.test
description: Test
allowed-tools:
  - Read
---
No argument-hint`;
    validateArgumentsUsage('test.md', content, 'command');
    assert.equal(errors.length, 0);
  });
});

describe('validateBannedTerminology', () => {
  beforeEach(() => _resetState());

  it('errors on banned term "recon"', () => {
    validateBannedTerminology('test.md', 'Run a recon pass on the codebase');
    assert.ok(errors.some((e) => e.includes('recon')));
  });

  it('passes on clean content', () => {
    validateBannedTerminology('test.md', 'Run a research pass on the codebase');
    assert.equal(errors.length, 0);
  });

  it('ignores banned terms inside code blocks', () => {
    validateBannedTerminology('test.md', '```\nrecon\n```');
    assert.equal(errors.length, 0);
  });
});

describe('validateBannedXmlTags', () => {
  beforeEach(() => _resetState());

  it('errors on generic <section> tag', () => {
    validateBannedXmlTags('test.md', '<section>\nContent\n</section>');
    assert.ok(errors.some((e) => e.includes('<section>')));
  });

  it('errors on generic <item> tag', () => {
    validateBannedXmlTags('test.md', '<item>Something</item>');
    assert.ok(errors.some((e) => e.includes('<item>')));
  });

  it('passes on semantic tags', () => {
    validateBannedXmlTags('test.md', '<objective>\nContent\n</objective>');
    assert.equal(errors.length, 0);
  });

  it('ignores banned tags inside code blocks', () => {
    validateBannedXmlTags('test.md', '```\n<section>Example</section>\n```');
    assert.equal(errors.length, 0);
  });
});

describe('validateCommandSectionOrder', () => {
  beforeEach(() => _resetState());

  it('accepts correct section order', () => {
    const content =
      '<objective>\nA\n</objective>\n<execution_context>\nB\n</execution_context>\n<context>\nC\n</context>\n<process>\nD\n</process>\n<success_criteria>\nE\n</success_criteria>';
    validateCommandSectionOrder('test.md', content, 'command');
    assert.equal(warnings.length, 0);
  });

  it('warns on wrong section order', () => {
    const content = '<process>\nA\n</process>\n<objective>\nB\n</objective>';
    validateCommandSectionOrder('test.md', content, 'command');
    assert.ok(warnings.some((w) => w.includes('appears before')));
  });

  it('skips non-command files', () => {
    validateCommandSectionOrder(
      'test.md',
      '<process>A</process>\n<objective>B</objective>',
      'agent'
    );
    assert.equal(warnings.length, 0);
  });
});

describe('validateAgentSectionOrder', () => {
  beforeEach(() => _resetState());

  it('accepts correct section order', () => {
    const content =
      '<role>\nA\n</role>\n<execution_flow>\nB\n</execution_flow>\n<success_criteria>\nC\n</success_criteria>';
    validateAgentSectionOrder('test.md', content, 'agent');
    assert.equal(warnings.length, 0);
  });

  it('warns on wrong order', () => {
    const content = '<success_criteria>\nA\n</success_criteria>\n<role>\nB\n</role>';
    validateAgentSectionOrder('test.md', content, 'agent');
    assert.ok(warnings.some((w) => w.includes('appears before')));
  });

  it('skips non-agent files', () => {
    validateAgentSectionOrder(
      'test.md',
      '<success_criteria>A</success_criteria>\n<role>B</role>',
      'command'
    );
    assert.equal(warnings.length, 0);
  });
});

describe('validateAgentCompletionMarkers', () => {
  beforeEach(() => _resetState());

  it('passes when a completion marker exists', () => {
    validateAgentCompletionMarkers('test.md', '## RUN COMPLETE', 'agent');
    assert.equal(warnings.length, 0);
  });

  it('accepts any valid marker', () => {
    validateAgentCompletionMarkers('test.md', '## GATE REACHED', 'agent');
    assert.equal(warnings.length, 0);
  });

  it('warns when no marker found', () => {
    validateAgentCompletionMarkers('test.md', 'No markers here', 'agent');
    assert.ok(warnings.some((w) => w.includes('No completion marker')));
  });

  it('skips non-agent files', () => {
    validateAgentCompletionMarkers('test.md', 'No markers here', 'command');
    assert.equal(warnings.length, 0);
  });
});

describe('validateAgentFirstStep', () => {
  beforeEach(() => _resetState());

  it('passes when first step references pulse.md', () => {
    const content = `<execution_flow>
<step name="load_project_state" priority="first">
Read pulse.md
</step>
</execution_flow>`;
    validateAgentFirstStep('test.md', content, 'agent');
    assert.equal(warnings.length, 0);
  });

  it('passes when step name contains "load"', () => {
    const content = `<execution_flow>
<step name="load_state" priority="first">
Do something
</step>
</execution_flow>`;
    validateAgentFirstStep('test.md', content, 'agent');
    assert.equal(warnings.length, 0);
  });

  it('warns when first step does not reference pulse.md or load', () => {
    const content = `<execution_flow>
<step name="do_work" priority="first">
Start working immediately
</step>
</execution_flow>`;
    validateAgentFirstStep('test.md', content, 'agent');
    assert.ok(warnings.some((w) => w.includes("doesn't reference pulse.md")));
  });

  it('skips non-agent files', () => {
    validateAgentFirstStep('test.md', 'anything', 'command');
    assert.equal(warnings.length, 0);
  });
});

describe('validateCommandDelegation', () => {
  beforeEach(() => _resetState());

  it('passes for short commands', () => {
    validateCommandDelegation('test.md', 'Short\n'.repeat(20), 'command');
    assert.equal(warnings.length, 0);
  });

  it('passes for long commands with workflow reference', () => {
    const content = 'Line\n'.repeat(501) + '@~/.claude/renn/workflows/run-stage.md';
    validateCommandDelegation('test.md', content, 'command');
    assert.equal(warnings.length, 0);
  });

  it('warns for long commands without workflow reference', () => {
    const content = 'Line\n'.repeat(501);
    validateCommandDelegation('test.md', content, 'command');
    assert.ok(warnings.some((w) => w.includes('no workflow reference')));
  });

  it('skips non-command files', () => {
    validateCommandDelegation('test.md', 'Line\n'.repeat(501), 'agent');
    assert.equal(warnings.length, 0);
  });
});

describe('validateBannedPhrases', () => {
  beforeEach(() => _resetState());

  it('warns on filler phrases', () => {
    validateBannedPhrases('test.md', 'Let me help you with that');
    assert.ok(warnings.some((w) => w.includes('Filler')));
  });

  it('warns on sycophancy with exclamation mark', () => {
    validateBannedPhrases('test.md', 'Great! That worked.');
    assert.ok(warnings.some((w) => w.includes('Sycophancy')));
  });

  it('warns on sycophancy without exclamation mark', () => {
    validateBannedPhrases('test.md', 'Great job on that');
    assert.ok(warnings.some((w) => w.includes('Sycophancy')));
  });

  it('warns on history language', () => {
    validateBannedPhrases('test.md', 'We changed the approach last week');
    assert.ok(warnings.some((w) => w.includes('History language')));
  });

  it('warns on enterprise language', () => {
    validateBannedPhrases('test.md', 'Add to the sprint backlog');
    assert.ok(warnings.some((w) => w.includes('Enterprise language')));
  });

  it('warns on human time estimates', () => {
    validateBannedPhrases('test.md', 'This takes about 3 hours');
    assert.ok(warnings.some((w) => w.includes('Human time estimate')));
  });

  it('passes on clean content', () => {
    validateBannedPhrases('test.md', 'Execute the task and report results');
    assert.equal(warnings.length, 0);
  });

  it('ignores phrases inside code blocks', () => {
    validateBannedPhrases('test.md', '```\nLet me show you\n```');
    assert.equal(warnings.length, 0);
  });

  it('ignores phrases inside example tags', () => {
    validateBannedPhrases('test.md', '<example>\nGreat! Let me help.\n</example>');
    assert.equal(warnings.length, 0);
  });
});

describe('validateTemplateStructure', () => {
  beforeEach(() => _resetState());

  it('passes with File Template section and guidance tag', () => {
    const content = '## File Template\n\nTemplate here\n\n<purpose>\nWhy\n</purpose>';
    validateTemplateStructure('test.md', content, 'template');
    assert.equal(warnings.length, 0);
  });

  it('warns when missing File Template section', () => {
    const content = '<purpose>\nWhy\n</purpose>';
    validateTemplateStructure('test.md', content, 'template');
    assert.ok(warnings.some((w) => w.includes('File Template')));
  });

  it('warns when missing guidance tag', () => {
    const content = '## File Template\n\nTemplate here';
    validateTemplateStructure('test.md', content, 'template');
    assert.ok(warnings.some((w) => w.includes('No guidance section')));
  });

  it('skips non-template files', () => {
    validateTemplateStructure('test.md', 'anything', 'command');
    assert.equal(warnings.length, 0);
  });
});

describe('validateTaskXmlStructure', () => {
  beforeEach(() => _resetState());

  it('passes when auto task has all required elements', () => {
    const content = `<task type="auto">
  <name>Task 1: Do thing</name>
  <action>What to do</action>
  <verify>How to check</verify>
  <done>When complete</done>
</task>`;
    validateTaskXmlStructure('test.md', content);
    assert.equal(warnings.length, 0);
  });

  it('warns when auto task missing elements', () => {
    const content = `<task type="auto">
  <name>Task 1: Do thing</name>
</task>`;
    validateTaskXmlStructure('test.md', content);
    assert.ok(warnings.some((w) => w.includes('<action>')));
    assert.ok(warnings.some((w) => w.includes('<verify>')));
    assert.ok(warnings.some((w) => w.includes('<done>')));
  });

  it('warns when checkpoint task missing what-built', () => {
    const content = `<task type="checkpoint:human-verify">
  <name>Check the output</name>
</task>`;
    validateTaskXmlStructure('test.md', content);
    assert.ok(warnings.some((w) => w.includes('<what-built>')));
  });

  it('ignores task tags inside code blocks', () => {
    const content = '```\n<task type="auto">\n<name>Example</name>\n</task>\n```';
    validateTaskXmlStructure('test.md', content);
    assert.equal(warnings.length, 0);
  });
});
