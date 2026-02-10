# ACE — Agentic Code Experience

A stage-driven, context-engineered agentic code execution system for Claude Code, OpenCode, and Gemini.

ACE gives your AI coding assistant a structured workflow: stages, tasks, state management, and specialized agents — so it builds your project methodically instead of wandering.

## Install

```bash
npx ace-experience
```

The installer walks you through setup — pick global or local install, choose your AI tool (Claude Code, OpenCode, Gemini, or all), and ACE copies the commands, agents, and workflows into the right place.

## What you get

- **25 slash commands** — structured actions like `/ace.run-stage`, `/ace.add-todo`, `/ace.audit`
- **11 specialized agents** — architect, runner, detective, auditor, and more
- **15 workflows** — reusable processes the commands delegate to
- **State files** — `pulse.md` (living memory), `track.md` (stage structure), `brief.md` (project context)

## How it works

1. **Initialize** — `/ace.start` sets up your project with a brief and stage structure
2. **Plan** — `/ace.plan-stage` breaks a stage into concrete tasks
3. **Build** — `/ace.run-stage` executes tasks with autonomous agents
4. **Track** — State files keep context across sessions so nothing gets lost

## Requirements

- Node.js 16.7+
- One of: Claude Code, OpenCode, or Gemini CLI

## License

[MIT](LICENSE)
