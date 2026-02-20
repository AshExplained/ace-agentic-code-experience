<planning_config>

Configuration options for `.renn/` directory behavior.

<config_schema>
```json
"planning": {
  "commit_docs": true,
  "search_gitignored": false
},
"git": {
  "branching_strategy": "none",
  "stage_branch_template": "ace/stage-{stage}-{slug}",
  "milestone_branch_template": "ace/{milestone}-{slug}"
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `commit_docs` | `true` | Whether to commit planning artifacts to git |
| `search_gitignored` | `false` | Add `--no-ignore` to broad rg searches |
| `git.branching_strategy` | `"none"` | Git branching approach: `"none"`, `"stage"`, or `"milestone"` |
| `git.stage_branch_template` | `"ace/stage-{stage}-{slug}"` | Branch template for stage strategy |
| `git.milestone_branch_template` | `"ace/{milestone}-{slug}"` | Branch template for milestone strategy |
</config_schema>

<commit_docs_behavior>

**When `commit_docs: true` (default):**
- Planning files committed normally
- recap.md, pulse.md, track.md tracked in git
- Full history of planning decisions preserved

**When `commit_docs: false`:**
- Skip all `git add`/`git commit` for `.renn/` files
- User must add `.renn/` to `.gitignore`
- Useful for: OSS contributions, client projects, keeping planning private

**Checking the config:**

```bash
# Check config.json first
COMMIT_DOCS=$(cat .renn/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")

# Auto-detect gitignored (overrides config)
git check-ignore -q .ace 2>/dev/null && COMMIT_DOCS=false
```

**Auto-detection:** If `.renn/` is gitignored, `commit_docs` is automatically `false` regardless of config.json. This prevents git errors when users have `.renn/` in `.gitignore`.

**Conditional git operations:**

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  git add .renn/pulse.md
  git commit -m "docs: update state"
fi
```

</commit_docs_behavior>

<search_behavior>

**When `search_gitignored: false` (default):**
- Standard rg behavior (respects .gitignore)
- Direct path searches work: `rg "pattern" .renn/` finds files
- Broad searches skip gitignored: `rg "pattern"` skips `.renn/`

**When `search_gitignored: true`:**
- Add `--no-ignore` to broad rg searches that should include `.renn/`
- Only needed when searching entire repo and expecting `.renn/` matches

**Note:** Most RENN operations use direct file reads or explicit paths, which work regardless of gitignore status.

</search_behavior>

<setup_uncommitted_mode>

To use uncommitted mode:

1. **Set config:**
   ```json
   "planning": {
     "commit_docs": false,
     "search_gitignored": true
   }
   ```

2. **Add to .gitignore:**
   ```
   .renn/
   ```

3. **Existing tracked files:** If `.renn/` is currently tracked by git:
   ```bash
   git rm -r --cached .renn/
   git commit -m "chore: stop tracking planning docs"
   ```

</setup_uncommitted_mode>

<branching_strategy_behavior>

**Branching Strategies:**

| Strategy | When branch created | Branch scope | Merge point |
|----------|---------------------|--------------|-------------|
| `none` | Never | N/A | N/A |
| `stage` | At `ace.run-stage` start | Single stage | User merges after stage |
| `milestone` | At first `ace.run-stage` of milestone | Entire milestone | At `ace.complete-milestone` |

**When `git.branching_strategy: "none"` (default):**
- All work commits to current branch
- Standard RENN behavior

**When `git.branching_strategy: "stage"`:**
- `ace.run-stage` creates/switches to a branch before execution
- Branch name from `stage_branch_template` (e.g., `ace/stage-03-authentication`)
- All run commits go to that branch
- User merges branches manually after stage completion
- `ace.complete-milestone` offers to merge all stage branches

**When `git.branching_strategy: "milestone"`:**
- First `ace.run-stage` of milestone creates the milestone branch
- Branch name from `milestone_branch_template` (e.g., `ace/v1.0-mvp`)
- All stages in milestone commit to same branch
- `ace.complete-milestone` offers to merge milestone branch to main

**Template variables:**

| Variable | Available in | Description |
|----------|--------------|-------------|
| `{stage}` | stage_branch_template | Zero-padded stage number (e.g., "03") |
| `{slug}` | Both | Lowercase, hyphenated name |
| `{milestone}` | milestone_branch_template | Milestone version (e.g., "v1.0") |

**Checking the config:**

```bash
# Get branching strategy (default: none)
BRANCHING_STRATEGY=$(cat .renn/config.json 2>/dev/null | grep -o '"branching_strategy"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "none")

# Get stage branch template
STAGE_BRANCH_TEMPLATE=$(cat .renn/config.json 2>/dev/null | grep -o '"stage_branch_template"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "ace/stage-{stage}-{slug}")

# Get milestone branch template
MILESTONE_BRANCH_TEMPLATE=$(cat .renn/config.json 2>/dev/null | grep -o '"milestone_branch_template"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)"/\1/' || echo "ace/{milestone}-{slug}")
```

**Branch creation:**

```bash
# For stage strategy
if [ "$BRANCHING_STRATEGY" = "stage" ]; then
  STAGE_SLUG=$(echo "$STAGE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
  BRANCH_NAME=$(echo "$STAGE_BRANCH_TEMPLATE" | sed "s/{stage}/$PADDED_STAGE/g" | sed "s/{slug}/$STAGE_SLUG/g")
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
fi

# For milestone strategy
if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  MILESTONE_SLUG=$(echo "$MILESTONE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
  BRANCH_NAME=$(echo "$MILESTONE_BRANCH_TEMPLATE" | sed "s/{milestone}/$MILESTONE_VERSION/g" | sed "s/{slug}/$MILESTONE_SLUG/g")
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
fi
```

**Merge options at ace.complete-milestone:**

| Option | Git command | Result |
|--------|-------------|--------|
| Squash merge (recommended) | `git merge --squash` | Single clean commit per branch |
| Merge with history | `git merge --no-ff` | Preserves all individual commits |
| Delete without merging | `git branch -D` | Discard branch work |
| Keep branches | (none) | Manual handling later |

Squash merge is recommended — keeps main branch history clean while preserving the full development history in the branch (until deleted).

**Use cases:**

| Strategy | Best for |
|----------|----------|
| `none` | Solo development, simple projects |
| `stage` | Code review per stage, granular rollback, team collaboration |
| `milestone` | Release branches, staging environments, PR per version |

</branching_strategy_behavior>

</planning_config>
