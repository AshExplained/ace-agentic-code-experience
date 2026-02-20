# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in RENN, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, use [GitHub's private vulnerability reporting](https://github.com/AshExplained/renn/security/advisories/new).

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### What to expect

- Acknowledgment within 48 hours
- A fix or mitigation plan within 7 days for critical issues
- Credit in the changelog (unless you prefer to remain anonymous)

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x | Yes |

## Security Measures

RENN includes:
- **Gitleaks** pre-commit hook to prevent accidental secret commits
- **npm `files` field + `.npmignore`** to prevent publishing sensitive files
- **Dependency auditing** via `npm audit` and Dependabot (once CI is live)
