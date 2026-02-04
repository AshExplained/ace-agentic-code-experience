# Specs Template

Template for `.ace/SPECS.md` — checkable requirements that define "done."

<template>

```markdown
# Specs: [Project Name]

**Defined:** [date]
**Core Value:** [from BRIEF.md]

## v1 Requirements

Requirements for initial release. Each maps to track stages.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User receives email verification after signup
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists across browser refresh

### [Category 2]

- [ ] **[CAT]-01**: [Requirement description]
- [ ] **[CAT]-02**: [Requirement description]
- [ ] **[CAT]-03**: [Requirement description]

### [Category 3]

- [ ] **[CAT]-01**: [Requirement description]
- [ ] **[CAT]-02**: [Requirement description]

## v2 Requirements

Deferred to future release. Tracked but not in current track.

### [Category]

- **[CAT]-01**: [Requirement description]
- **[CAT]-02**: [Requirement description]

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| [Feature] | [Why excluded] |
| [Feature] | [Why excluded] |

## Traceability

Which stages cover which requirements. Updated during track creation.

| Requirement | Stage | Status |
|-------------|-------|--------|
| AUTH-01 | Stage 1 | Pending |
| AUTH-02 | Stage 1 | Pending |
| AUTH-03 | Stage 1 | Pending |
| AUTH-04 | Stage 1 | Pending |
| [REQ-ID] | Stage [N] | Pending |

**Coverage:**
- v1 requirements: [X] total
- Mapped to stages: [Y]
- Unmapped: [Z]

---
*Specs defined: [date]*
*Last updated: [date] after [trigger]*
```

</template>

<guidelines>

**Requirement Format:**
- ID: `[CATEGORY]-[NUMBER]` (AUTH-01, CONTENT-02, SOCIAL-03)
- Description: User-centric, testable, atomic
- Checkbox: Only for v1 requirements (v2 are not yet actionable)

**Categories:**
- Derive from recon FEATURES.md categories
- Keep consistent with domain conventions
- Typical: Authentication, Content, Social, Notifications, Moderation, Payments, Admin

**v1 vs v2:**
- v1: Committed scope, will be in track stages
- v2: Acknowledged but deferred, not in current track
- Moving v2 -> v1 requires track update

**Out of Scope:**
- Explicit exclusions with reasoning
- Prevents "why didn't you include X?" later
- Anti-features from recon belong here with warnings

**Traceability:**
- Empty initially, populated during track creation
- Each requirement maps to exactly one stage
- Unmapped requirements = track gap

**Status Values:**
- Pending: Not started
- In Progress: Stage is active
- Complete: Requirement verified
- Blocked: Waiting on external factor

</guidelines>

<evolution>

**After each stage completes:**
1. Mark covered requirements as Complete
2. Update traceability status
3. Note any requirements that changed scope

**After track updates:**
1. Verify all v1 requirements still mapped
2. Add new requirements if scope expanded
3. Move requirements to v2/out of scope if descoped

**Requirement completion criteria:**
- Requirement is "Complete" when:
  - Feature is implemented
  - Feature is verified (tests pass, manual check done)
  - Feature is committed

</evolution>

<example>

```markdown
# Specs: CommunityApp

**Defined:** 2025-01-14
**Core Value:** Users can share and discuss content with people who share their interests

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User receives email verification after signup
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists across browser refresh

### Profiles

- [ ] **PROF-01**: User can create profile with display name
- [ ] **PROF-02**: User can upload avatar image
- [ ] **PROF-03**: User can write bio (max 500 chars)
- [ ] **PROF-04**: User can view other users' profiles

### Content

- [ ] **CONT-01**: User can create text post
- [ ] **CONT-02**: User can upload image with post
- [ ] **CONT-03**: User can edit own posts
- [ ] **CONT-04**: User can delete own posts
- [ ] **CONT-05**: User can view feed of posts

### Social

- [ ] **SOCL-01**: User can follow other users
- [ ] **SOCL-02**: User can unfollow users
- [ ] **SOCL-03**: User can like posts
- [ ] **SOCL-04**: User can comment on posts
- [ ] **SOCL-05**: User can view activity feed (followed users' posts)

## v2 Requirements

### Notifications

- **NOTF-01**: User receives in-app notifications
- **NOTF-02**: User receives email for new followers
- **NOTF-03**: User receives email for comments on own posts
- **NOTF-04**: User can configure notification preferences

### Moderation

- **MODR-01**: User can report content
- **MODR-02**: User can block other users
- **MODR-03**: Admin can view reported content
- **MODR-04**: Admin can remove content
- **MODR-05**: Admin can ban users

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time chat | High complexity, not core to community value |
| Video posts | Storage/bandwidth costs, defer to v2+ |
| OAuth login | Email/password sufficient for v1 |
| Mobile app | Web-first, mobile later |

## Traceability

| Requirement | Stage | Status |
|-------------|-------|--------|
| AUTH-01 | Stage 1 | Pending |
| AUTH-02 | Stage 1 | Pending |
| AUTH-03 | Stage 1 | Pending |
| AUTH-04 | Stage 1 | Pending |
| PROF-01 | Stage 2 | Pending |
| PROF-02 | Stage 2 | Pending |
| PROF-03 | Stage 2 | Pending |
| PROF-04 | Stage 2 | Pending |
| CONT-01 | Stage 3 | Pending |
| CONT-02 | Stage 3 | Pending |
| CONT-03 | Stage 3 | Pending |
| CONT-04 | Stage 3 | Pending |
| CONT-05 | Stage 3 | Pending |
| SOCL-01 | Stage 4 | Pending |
| SOCL-02 | Stage 4 | Pending |
| SOCL-03 | Stage 4 | Pending |
| SOCL-04 | Stage 4 | Pending |
| SOCL-05 | Stage 4 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to stages: 18
- Unmapped: 0

---
*Specs defined: 2025-01-14*
*Last updated: 2025-01-14 after initial definition*
```

</example>
