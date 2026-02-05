---
name: ace.check-todos
description: List pending todos and select one to work on
argument-hint: [area filter]
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

<objective>
List all pending todos, allow selection, load full context for the selected todo, and route to appropriate action.

Enables reviewing captured ideas and deciding what to work on next.
</objective>

<context>
@.ace/pulse.md
@.ace/track.md
</context>

<process>

<step name="check_exist">
```bash
TODO_COUNT=$(ls .ace/todos/pending/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "Pending todos: $TODO_COUNT"
```

If count is 0:
```
No pending todos.

Todos are captured during work sessions with /ace.add-todo.

---

Would you like to:

1. Continue with current stage (/ace.status)
2. Add a todo now (/ace.add-todo)
```

Exit.
</step>

<step name="parse_filter">
Check for area filter in arguments:
- `/ace.check-todos` → show all
- `/ace.check-todos api` → filter to area:api only
</step>

<step name="list_todos">
```bash
for file in .ace/todos/pending/*.md; do
  created=$(grep "^created:" "$file" | cut -d' ' -f2)
  title=$(grep "^title:" "$file" | cut -d':' -f2- | xargs)
  area=$(grep "^area:" "$file" | cut -d' ' -f2)
  echo "$created|$title|$area|$file"
done | sort
```

Apply area filter if specified. Display as numbered list:

```
Pending Todos:

1. Add auth token refresh (api, 2d ago)
2. Fix modal z-index issue (ui, 1d ago)
3. Refactor database connection pool (database, 5h ago)

---

Reply with a number to view details, or:
- `/ace.check-todos [area]` to filter by area
- `q` to exit
```

Format age as relative time.
</step>

<step name="handle_selection">
Wait for user to reply with a number.

If valid: load selected todo, proceed.
If invalid: "Invalid selection. Reply with a number (1-[N]) or `q` to exit."
</step>

<step name="load_context">
Read the todo file completely. Display:

```
## [title]

**Area:** [area]
**Created:** [date] ([relative time] ago)
**Files:** [list or "None"]

### Problem
[problem section content]

### Solution
[solution section content]
```

If `files` field has entries, read and briefly summarize each.
</step>

<step name="check_track">
```bash
ls .ace/track.md 2>/dev/null && echo "Track exists"
```

If track exists:
1. Check if todo's area matches an upcoming stage
2. Check if todo's files overlap with a stage's scope
3. Note any match for action options
</step>

<step name="offer_actions">
**If todo maps to a track stage:**

Use AskUserQuestion:
- header: "Action"
- question: "This todo relates to Stage [N]: [name]. What would you like to do?"
- options:
  - "Work on it now" — move to done, start working
  - "Add to stage run" — include when planning Stage [N]
  - "Brainstorm approach" — think through before deciding
  - "Put it back" — return to list

**If no track match:**

Use AskUserQuestion:
- header: "Action"
- question: "What would you like to do with this todo?"
- options:
  - "Work on it now" — move to done, start working
  - "Create a stage" — /ace.add-stage with this scope
  - "Brainstorm approach" — think through before deciding
  - "Put it back" — return to list
</step>

<step name="execute_action">
**Work on it now:**
```bash
mv ".ace/todos/pending/[filename]" ".ace/todos/done/"
```
Update pulse.md todo count. Present problem/solution context. Begin work or ask how to proceed.

**Add to stage run:**
Note todo reference in stage planning notes. Keep in pending. Return to list or exit.

**Create a stage:**
Display: `/ace.add-stage [description from todo]`
Keep in pending. User runs command in fresh context.

**Brainstorm approach:**
Keep in pending. Start discussion about problem and approaches.

**Put it back:**
Return to list_todos step.
</step>

<step name="update_state">
After any action that changes todo count:

```bash
ls .ace/todos/pending/*.md 2>/dev/null | wc -l
```

Update pulse.md "### Pending Todos" section if exists.
</step>

<step name="git_commit">
If todo was moved to done/, commit the change:

**Check planning config:**

```bash
COMMIT_PLANNING_DOCS=$(cat .ace/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .ace 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

**If `COMMIT_PLANNING_DOCS=false`:** Skip git operations, log "Todo moved (not committed - commit_docs: false)"

**If `COMMIT_PLANNING_DOCS=true` (default):**

```bash
git add .ace/todos/done/[filename]
git rm --cached .ace/todos/pending/[filename] 2>/dev/null || true
[ -f .ace/pulse.md ] && git add .ace/pulse.md
git commit -m "$(cat <<'EOF'
docs: start work on todo - [title]

Moved to done/, beginning implementation.
EOF
)"
```

Confirm: "Committed: docs: start work on todo - [title]"
</step>

</process>

<output>
- Moved todo to `.ace/todos/done/` (if "Work on it now")
- Updated `.ace/pulse.md` (if todo count changed)
</output>

<anti_patterns>
- Don't delete todos — move to done/ when work begins
- Don't start work without moving to done/ first
- Don't create runs from this command — route to /ace.plan-stage or /ace.add-stage
</anti_patterns>

<success_criteria>
- [ ] All pending todos listed with title, area, age
- [ ] Area filter applied if specified
- [ ] Selected todo's full context loaded
- [ ] Track context checked for stage match
- [ ] Appropriate actions offered
- [ ] Selected action executed
- [ ] pulse.md updated if todo count changed
- [ ] Changes committed to git (if todo moved to done/)
</success_criteria>
