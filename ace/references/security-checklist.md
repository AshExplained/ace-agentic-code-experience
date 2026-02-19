# Security Checklist

Comprehensive security reference for ACE-managed projects. Consumed by ace-auditor (Step 7.6) and ace-integration-checker (Step 4.5) via @-reference.

<overview>
This checklist contains 39 items organized across 10 groups. Each item includes a severity classification, provenance markers tracing to OWASP/CWE/API standards, vulnerable and secure code examples, and grep-based detection patterns.

**10 Groups (39 items total):**

| # | Group | Items | Primary Sources |
|---|-------|-------|-----------------|
| 1 | Access Control & Authorization | 5 | OWASP-A01, API-01, API-05 |
| 2 | Injection & Input Validation | 5 | OWASP-A05, CWE-79, CWE-89 |
| 3 | Authentication & Session Management | 4 | OWASP-A07, API-02 |
| 4 | Cryptographic Failures | 3 | OWASP-A04, CWE-327 |
| 5 | Security Misconfiguration | 4 | OWASP-A02, API-08 |
| 6 | API Security | 4 | API-03, API-04, API-06 |
| 7 | Supply Chain & Dependencies | 3 | OWASP-A03, OWASP-A08 |
| 8 | LLM & AI-Specific Security | 5 | LLM-01 through LLM-10 |
| 9 | Cloud & Infrastructure Security | 3 | OWASP-A02 |
| 10 | Framework-Specific Pitfalls | 3 | Framework CVEs |

Groups 1-5 absorb the 10 code-reviewer security categories (auth, authz, input validation, XSS, SQLi, CSRF, crypto, error handling, logging, dependencies) so this checklist is the single source of truth.
</overview>

## Severity Classification

| Severity | Meaning | Action | CVSS Equivalent |
|----------|---------|--------|-----------------|
| **Blocker** | Exploitable vulnerability, data breach risk | Must fix before deploy | Critical/High (7.0+) |
| **Warning** | Security weakness, defense-in-depth gap | Should fix, acceptable risk with justification | Medium (4.0-6.9) |
| **Info** | Best practice, hardening recommendation | Fix when convenient | Low (0.1-3.9) |

## Consumer Usage

Agents consuming this checklist follow this protocol:

1. **Auto-scope by group:** Read each group's `<stack_detection>` block. Run the detection command against the project. Skip the entire group if detection returns false.
2. **Review relevant items:** For each item in a relevant group, reason about data flows and auth logic (LLM-based review). Optionally run the item's detection grep patterns for supporting evidence.
3. **Flag findings:** Report each finding with the item's severity and provenance marker. Blockers must be resolved before deploy. Warnings need justification if deferred. Info items are recommendations.
4. **Output format:** Append findings to proof.md gaps section (auditor) or MILESTONE-AUDIT.md gaps.security section (integration-checker).

---

## Group 1: Access Control & Authorization

<stack_detection>
**Relevant when ANY of these are detected:**
- `package.json` exists with web framework dependencies
- Python files with web framework imports (`flask`, `django`, `fastapi`)
- Route or endpoint files exist

**Detection command:**
```bash
[ -f package.json ] || grep -rql "from flask\|from django\|from fastapi" . --include="*.py" 2>/dev/null
```
</stack_detection>

### Item 1.1: Missing Access Control on Routes

**Provenance:** OWASP-A01, CWE-862
**Severity:** Blocker
**Verification:** static

Endpoints that perform sensitive operations without verifying the caller is authenticated or authorized. Any unauthenticated user can access protected resources.

**Vulnerable:**
```typescript
// No auth check -- anyone can access admin data
export async function GET(req: Request) {
  const users = await prisma.user.findMany();
  return Response.json(users);
}
```

**Secure:**
```typescript
// Auth check before data access
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany();
  return Response.json(users);
}
```

**Detection:**
```bash
# Flag: route handlers without auth/session checks
grep -rlE "export (async )?function (GET|POST|PUT|PATCH|DELETE)" src/ --include="*.ts" | xargs grep -L "getSession\|getServerSession\|auth(\|requireAuth\|verifyToken\|currentUser"
```

---

### Item 1.2: Broken Object-Level Authorization (BOLA/IDOR)

**Provenance:** OWASP-A01, API-01, CWE-639
**Severity:** Blocker
**Verification:** static

User-supplied IDs used to fetch resources without verifying the requesting user owns or has access to that resource. Attackers enumerate IDs to access other users' data.

**Vulnerable:**
```typescript
// Fetches any user's data by ID -- no ownership check
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const record = await prisma.document.findUnique({
    where: { id: params.id },
  });
  return Response.json(record);
}
```

**Secure:**
```typescript
// Ownership check: only return records belonging to the authenticated user
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const record = await prisma.document.findUnique({
    where: { id: params.id, userId: session.user.id },
  });
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(record);
}
```

**Detection:**
```bash
# Flag: findUnique/findFirst using only params.id without userId filter
grep -rnE "findUnique|findFirst|findOne" src/ --include="*.ts" | grep -i "params\.\(id\|slug\)" | grep -v "userId\|ownerId\|session\|auth"
```

---

### Item 1.3: Broken Function-Level Authorization

**Provenance:** OWASP-A01, API-05, CWE-269
**Severity:** Blocker
**Verification:** static

Admin-only operations accessible to regular users because role or permission checks are missing. A regular user can call admin endpoints by guessing the URL.

**Vulnerable:**
```typescript
// Admin endpoint with no role check
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // Missing: role check -- any authenticated user can delete
  await prisma.user.delete({ where: { id: params.id } });
  return Response.json({ success: true });
}
```

**Secure:**
```typescript
// Role-based access control on admin operations
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.user.delete({ where: { id: params.id } });
  return Response.json({ success: true });
}
```

**Detection:**
```bash
# Flag: DELETE/PUT handlers with auth but no role/permission check
grep -rlE "export (async )?function (DELETE|PUT)" src/ --include="*.ts" | xargs grep -l "getSession\|auth(" | xargs grep -L "role\|permission\|isAdmin\|canDelete\|authorize"
```

---

### Item 1.4: Privilege Escalation via Mass Assignment

**Provenance:** OWASP-A01, API-03, CWE-915
**Severity:** Warning
**Verification:** static

Request body spread directly into database update or create operations, allowing attackers to set fields they should not control (role, isAdmin, balance).

**Vulnerable:**
```typescript
// Spreads entire request body into update -- attacker can set role: "admin"
export async function PUT(req: Request) {
  const session = await getSession(req);
  const body = await req.json();
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: body, // Attacker sends { role: "admin", isVerified: true }
  });
  return Response.json(user);
}
```

**Secure:**
```typescript
// Allowlist: only permitted fields are passed to the database
export async function PUT(req: Request) {
  const session = await getSession(req);
  const body = await req.json();
  const { name, email, avatar } = body; // Destructure only allowed fields
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, email, avatar },
  });
  return Response.json(user);
}
```

**Detection:**
```bash
# Flag: spreading request body into create/update
grep -rnE "data:\s*body|data:\s*req\.body|data:\s*\.\.\.(body|req\.body|data|input)" src/ --include="*.ts"
```

---

### Item 1.5: SSRF via User-Controlled URLs

**Provenance:** OWASP-A01, CWE-918
**Severity:** Blocker
**Verification:** static

Server-side code fetches a URL provided by the user without validating the destination. Attackers can probe internal services, cloud metadata endpoints, or internal network resources.

**Vulnerable:**
```typescript
// Fetches any URL the user provides -- SSRF to internal services
export async function POST(req: Request) {
  const { url } = await req.json();
  const response = await fetch(url); // Attacker sends http://169.254.169.254/metadata
  const data = await response.text();
  return Response.json({ data });
}
```

**Secure:**
```typescript
// Validate URL against allowlist of permitted domains
const ALLOWED_HOSTS = ["api.example.com", "cdn.example.com"];

export async function POST(req: Request) {
  const { url } = await req.json();
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return Response.json({ error: "URL not allowed" }, { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return Response.json({ error: "HTTPS required" }, { status: 400 });
  }
  const response = await fetch(parsed.toString());
  const data = await response.text();
  return Response.json({ data });
}
```

**Detection:**
```bash
# Flag: fetch/axios/got/request called with user-controlled variable
grep -rnE "fetch\(\s*(url|href|link|endpoint|target|destination|body\.|req\.|params\.)" src/ --include="*.ts" --include="*.js"
```

---

## Group 2: Injection & Input Validation

<stack_detection>
**Relevant when ANY of these are detected:**
- Any source code files exist (`.ts`, `.js`, `.py`, `.rb`, `.go`, `.java`)
- This group applies to virtually all projects

**Detection command:**
```bash
ls src/ *.ts *.js *.py 2>/dev/null | head -1 | grep -q . && true || false
```
</stack_detection>

### Item 2.1: SQL Injection

**Provenance:** OWASP-A05, CWE-89
**Severity:** Blocker
**Verification:** static

User-controlled input concatenated or interpolated into SQL queries enables attackers to read, modify, or delete arbitrary database records.

**Vulnerable:**
```typescript
// String interpolation in SQL query -- attacker controls userId
const user = await db.query(
  `SELECT * FROM users WHERE id = '${req.params.id}'`
);
```

**Secure:**
```typescript
// Parameterized query -- input cannot escape the parameter slot
const user = await db.query(
  "SELECT * FROM users WHERE id = $1",
  [req.params.id]
);

// ORM equivalent (Prisma) -- parameters handled automatically
const user = await prisma.user.findUnique({
  where: { id: req.params.id },
});
```

**Detection:**
```bash
# Flag: string interpolation inside query calls
grep -rnE "(query|execute|raw)\s*\(\s*\`[^\`]*\\\$\{" src/ --include="*.ts" --include="*.js"
# Flag: string concatenation in query
grep -rnE "(query|execute|raw)\s*\(['\"].*\+" src/ --include="*.ts" --include="*.js"
```

---

### Item 2.2: Cross-Site Scripting (XSS)

**Provenance:** OWASP-A05, CWE-79
**Severity:** Blocker
**Verification:** static

User-supplied content rendered into HTML without encoding. Attackers inject script tags to steal cookies, redirect users, or impersonate the victim.

**Vulnerable:**
```typescript
// dangerouslySetInnerHTML with unsanitized user content
function Comment({ text }: { text: string }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
}

// Server-side: direct HTML insertion
res.send(`<div>${userInput}</div>`);
```

**Secure:**
```typescript
// React auto-escapes by default -- use JSX text nodes
function Comment({ text }: { text: string }) {
  return <div>{text}</div>;
}

// When HTML rendering is required, sanitize first
import DOMPurify from "dompurify";
function RichComment({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}
```

**Detection:**
```bash
# Flag: dangerouslySetInnerHTML usage
grep -rn "dangerouslySetInnerHTML" src/ --include="*.tsx" --include="*.jsx"
# Flag: direct HTML string construction with variables
grep -rnE "innerHTML\s*=|\.html\(\s*[^'\"]" src/ --include="*.ts" --include="*.js"
```

---

### Item 2.3: OS Command Injection

**Provenance:** OWASP-A05, CWE-78
**Severity:** Blocker
**Verification:** static

User input passed to shell execution functions. Attackers chain commands using `; rm -rf /` or pipe operators to execute arbitrary system commands.

**Vulnerable:**
```typescript
import { exec } from "child_process";

// User input directly in shell command
export async function POST(req: Request) {
  const { filename } = await req.json();
  exec(`convert ${filename} output.pdf`); // Attacker sends "; rm -rf /"
}
```

**Secure:**
```typescript
import { execFile } from "child_process";

// execFile does not spawn a shell -- arguments are passed as array
export async function POST(req: Request) {
  const { filename } = await req.json();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  execFile("convert", [sanitized, "output.pdf"]);
}
```

**Detection:**
```bash
# Flag: exec/execSync with template literals or concatenation
grep -rnE "(exec|execSync|spawn)\s*\(\s*(\`|['\"].*\+)" src/ --include="*.ts" --include="*.js"
# Flag: child_process exec usage (review all)
grep -rn "require.*child_process\|from.*child_process" src/ --include="*.ts" --include="*.js"
```

---

### Item 2.4: Path Traversal

**Provenance:** OWASP-A05, CWE-22
**Severity:** Blocker
**Verification:** static

User-supplied file paths used in filesystem operations without sanitization. Attackers use `../` sequences to access files outside the intended directory.

**Vulnerable:**
```typescript
import { readFile } from "fs/promises";
import path from "path";

// User controls filename -- can traverse with ../../etc/passwd
export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file");
  const content = await readFile(`./uploads/${file}`, "utf-8");
  return Response.json({ content });
}
```

**Secure:**
```typescript
import { readFile } from "fs/promises";
import path from "path";

// Resolve and validate path stays within uploads directory
export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file");
  const uploadsDir = path.resolve("./uploads");
  const resolved = path.resolve(uploadsDir, file ?? "");
  if (!resolved.startsWith(uploadsDir)) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }
  const content = await readFile(resolved, "utf-8");
  return Response.json({ content });
}
```

**Detection:**
```bash
# Flag: readFile/createReadStream with user-controlled path
grep -rnE "(readFile|createReadStream|readdir|writeFile)\s*\(\s*(\`|['\"].*\+|path\.join\(.*req\.|.*params\.)" src/ --include="*.ts" --include="*.js"
```

---

### Item 2.5: NoSQL Injection

**Provenance:** OWASP-A05, CWE-943
**Severity:** Warning
**Verification:** static

User input passed directly as MongoDB query operators. Attackers send `{"$gt": ""}` instead of a string value to bypass authentication or extract data.

**Vulnerable:**
```typescript
// User input used directly as MongoDB query -- injection via {"$gt": ""}
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.collection("users").findOne({
    username: username,
    password: password, // Attacker sends { "$gt": "" } to match any password
  });
  if (user) res.json({ token: createToken(user) });
});
```

**Secure:**
```typescript
// Validate input types before using in query
import { z } from "zod";
const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

app.post("/login", async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);
  const user = await db.collection("users").findOne({ username });
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    res.json({ token: createToken(user) });
  }
});
```

**Detection:**
```bash
# Flag: MongoDB findOne/find with unsanitized req.body fields
grep -rnE "findOne\(\s*\{[^}]*req\.body\|find\(\s*\{[^}]*req\.body" src/ --include="*.ts" --include="*.js"
# Flag: MongoDB operations without schema validation
grep -rnE "(collection|model)\.[a-z]+\(" src/ --include="*.ts" | grep -v "schema\|validate\|parse\|sanitize"
```

---

## Group 3: Authentication & Session Management

<stack_detection>
**Relevant when ANY of these are detected:**
- Files matching auth, login, session, token, or password patterns
- JWT or session-related dependencies in package.json
- Auth middleware files

**Detection command:**
```bash
grep -rqlE "auth|login|session|jsonwebtoken|jwt|bcrypt|passport|next-auth" package.json src/ 2>/dev/null
```
</stack_detection>

### Item 3.1: Weak Password Storage

**Provenance:** OWASP-A07, CWE-916
**Severity:** Blocker
**Verification:** static

Passwords stored in plaintext, with weak hashing (MD5, SHA-1), or without a salt. Compromised databases expose all user credentials instantly.

**Vulnerable:**
```typescript
// Storing password in plaintext
await prisma.user.create({
  data: { email, password }, // Plaintext password in database
});

// Weak hashing -- MD5 is broken, no salt
import crypto from "crypto";
const hash = crypto.createHash("md5").update(password).digest("hex");
```

**Secure:**
```typescript
// bcrypt with appropriate cost factor (10+)
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(password, SALT_ROUNDS);
await prisma.user.create({
  data: { email, passwordHash: hash },
});

// Verification
const isValid = await bcrypt.compare(submittedPassword, user.passwordHash);
```

**Detection:**
```bash
# Flag: storing raw password field (not passwordHash)
grep -rnE "data:\s*\{[^}]*password[^H]" src/ --include="*.ts" | grep -v "passwordHash\|hashedPassword"
# Flag: weak hash algorithms
grep -rnE "createHash\(['\"]md5|createHash\(['\"]sha1" src/ --include="*.ts" --include="*.js"
```

---

### Item 3.2: Missing Brute Force Protection

**Provenance:** OWASP-A07, API-04, CWE-307
**Severity:** Warning
**Verification:** static

Login endpoints without rate limiting or account lockout. Attackers automate credential stuffing with thousands of attempts per second.

**Vulnerable:**
```typescript
// No rate limiting -- unlimited login attempts
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await findUser(email);
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    return res.json({ token: createToken(user) });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});
```

**Secure:**
```typescript
// Rate limiting with express-rate-limit
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: "Too many login attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await findUser(email);
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    return res.json({ token: createToken(user) });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});
```

**Detection:**
```bash
# Flag: login/auth routes without rate limiting middleware
grep -rlE "login|authenticate|sign.?in" src/ --include="*.ts" | xargs grep -L "rateLimit\|rate.limit\|throttle\|limiter"
```

---

### Item 3.3: Insecure Session/Token Configuration

**Provenance:** OWASP-A07, CWE-614
**Severity:** Warning
**Verification:** static

Session cookies or tokens configured without security flags. Missing `httpOnly` allows JavaScript to steal cookies via XSS. Missing `secure` sends cookies over HTTP in plaintext.

**Vulnerable:**
```typescript
// Cookie without security flags
res.cookie("session", token, {
  maxAge: 86400000,
  // Missing: httpOnly, secure, sameSite
});

// JWT stored in localStorage -- accessible via XSS
localStorage.setItem("token", jwt);
```

**Secure:**
```typescript
// Cookie with all security flags
res.cookie("session", token, {
  httpOnly: true,    // Not accessible via JavaScript
  secure: true,      // Only sent over HTTPS
  sameSite: "lax",   // CSRF protection
  maxAge: 86400000,  // 24 hours
  path: "/",
});
```

**Detection:**
```bash
# Flag: cookies set without httpOnly or secure
grep -rnE "\.cookie\(|setCookie\(|set-cookie" src/ --include="*.ts" | grep -v "httpOnly.*true\|secure.*true"
# Flag: tokens stored in localStorage
grep -rn "localStorage\.setItem.*token\|localStorage\.setItem.*jwt\|localStorage\.setItem.*session" src/ --include="*.ts" --include="*.tsx"
```

---

### Item 3.4: Missing Token Expiry or Refresh Rotation

**Provenance:** OWASP-A07, CWE-613
**Severity:** Warning
**Verification:** static

JWTs issued without expiration or refresh tokens that are reusable indefinitely. Compromised tokens grant permanent access.

**Vulnerable:**
```typescript
import jwt from "jsonwebtoken";

// No expiry -- token valid forever
const token = jwt.sign({ userId: user.id }, SECRET);

// Refresh token reused without rotation
app.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  const payload = jwt.verify(refreshToken, SECRET);
  const newAccess = jwt.sign({ userId: payload.userId }, SECRET);
  res.json({ accessToken: newAccess }); // Same refresh token stays valid
});
```

**Secure:**
```typescript
import { SignJWT } from "jose";

// Short-lived access token with expiry
const accessToken = await new SignJWT({ userId: user.id })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("15m")
  .setIssuedAt()
  .sign(secret);

// Refresh rotation -- old token invalidated, new one issued
app.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revoked) return res.status(401).json({ error: "Invalid" });
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  const newRefresh = await createRefreshToken(stored.userId);
  const newAccess = await createAccessToken(stored.userId);
  res.json({ accessToken: newAccess, refreshToken: newRefresh });
});
```

**Detection:**
```bash
# Flag: JWT sign without expiresIn or exp claim
grep -rnE "jwt\.sign\(|new SignJWT" src/ --include="*.ts" | grep -v "expiresIn\|setExpirationTime\|exp:"
```

---

## Group 4: Cryptographic Failures

<stack_detection>
**Relevant when ANY of these are detected:**
- Files containing crypto, hash, encrypt, or secret patterns
- `.env` files exist
- Package.json with crypto-related dependencies

**Detection command:**
```bash
grep -rqlE "crypto|bcrypt|jwt|secret|encrypt|hash|\.env" . --include="*.ts" --include="*.js" --include="*.env*" 2>/dev/null
```
</stack_detection>

### Item 4.1: Hardcoded Secrets and API Keys

**Provenance:** OWASP-A04, CWE-798
**Severity:** Blocker
**Verification:** static

API keys, database passwords, JWT secrets, or encryption keys hardcoded in source code. Anyone with repository access (including public repos) can extract credentials.

**Vulnerable:**
```typescript
// Hardcoded JWT secret in source code
const JWT_SECRET = "super-secret-key-12345";

// Hardcoded database connection string with password
const db = new Client({
  connectionString: "postgresql://admin:p@ssw0rd@localhost:5432/mydb",
});

// Hardcoded API key
const stripe = new Stripe("sk_live_EXAMPLE_FAKE_KEY");
```

**Secure:**
```typescript
// Secrets loaded from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable required");

const db = new Client({
  connectionString: process.env.DATABASE_URL,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

**Detection:**
```bash
# Flag: hardcoded secrets patterns
grep -rnE "(secret|password|api.?key|token)\s*[:=]\s*['\"][^'\"]{8,}" src/ --include="*.ts" --include="*.js" -i
# Flag: connection strings with embedded credentials
grep -rnE "(postgresql|mysql|mongodb|redis)://[^:]+:[^@]+@" src/ --include="*.ts" --include="*.js"
# Flag: private keys in source
grep -rn "PRIVATE KEY\|BEGIN RSA\|BEGIN EC" src/ --include="*.ts" --include="*.js" --include="*.pem"
```

---

### Item 4.2: Weak or Deprecated Cryptographic Algorithms

**Provenance:** OWASP-A04, CWE-327
**Severity:** Warning
**Verification:** static

Use of broken or deprecated algorithms (MD5, SHA-1 for security, DES, RC4). These have known attacks that break their security guarantees.

**Vulnerable:**
```typescript
import crypto from "crypto";

// MD5 -- collision attacks are trivial
const hash = crypto.createHash("md5").update(data).digest("hex");

// DES -- key space too small, broken since 1990s
const cipher = crypto.createCipheriv("des-ecb", key, null);

// SHA-1 for signatures -- collision attacks demonstrated (SHAttered)
const signature = crypto.createSign("SHA1").update(data).sign(privateKey);
```

**Secure:**
```typescript
import crypto from "crypto";

// SHA-256 for hashing
const hash = crypto.createHash("sha256").update(data).digest("hex");

// AES-256-GCM for encryption (authenticated encryption)
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

// SHA-256 for signatures
const signature = crypto.createSign("SHA256").update(data).sign(privateKey);
```

**Detection:**
```bash
# Flag: deprecated algorithms
grep -rnE "createHash\(['\"]md5|createHash\(['\"]sha1|createCipher[^i]|des-|rc4|blowfish" src/ --include="*.ts" --include="*.js"
```

---

### Item 4.3: Insufficient Randomness

**Provenance:** OWASP-A04, CWE-330
**Severity:** Warning
**Verification:** static

Using `Math.random()` for security-sensitive values (tokens, session IDs, passwords). `Math.random()` is not cryptographically secure and its output is predictable.

**Vulnerable:**
```typescript
// Math.random() for token generation -- predictable
function generateToken() {
  return Math.random().toString(36).substring(2);
}

// Short or low-entropy tokens
const resetToken = String(Math.floor(Math.random() * 10000)); // 4 digits
```

**Secure:**
```typescript
import crypto from "crypto";

// Cryptographically secure random bytes
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// For UUID generation
const sessionId = crypto.randomUUID();
```

**Detection:**
```bash
# Flag: Math.random() used for tokens, secrets, or IDs
grep -rnE "Math\.random\(\)" src/ --include="*.ts" --include="*.js" | grep -iE "token\|secret\|session\|key\|password\|id\|nonce\|salt"
```

---

## Group 5: Security Misconfiguration

<stack_detection>
**Relevant when ANY of these are detected:**
- Configuration files exist (next.config, vite.config, tsconfig, .env, etc.)
- Package.json exists
- Deployment configuration files

**Detection command:**
```bash
ls next.config.* vite.config.* .env* package.json tsconfig.json docker-compose* 2>/dev/null | head -1 | grep -q . && true || false
```
</stack_detection>

### Item 5.1: Debug Mode in Production

**Provenance:** OWASP-A02, CWE-489
**Severity:** Warning
**Verification:** static

Debug flags, verbose error output, or development-mode settings left enabled in production. Exposes stack traces, internal paths, and system details to attackers.

**Vulnerable:**
```typescript
// Express with detailed error messages in production
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,      // Exposes internal paths and call chain
    query: req.query,      // Leaks request details
  });
});

// Debug flag left on
const DEBUG = true; // Should be false in production
```

**Secure:**
```typescript
// Environment-aware error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err); // Log full error server-side
  res.status(500).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
});
```

**Detection:**
```bash
# Flag: stack traces or debug info in responses
grep -rnE "err\.stack|error\.stack|stack.*res\.|DEBUG\s*=\s*true" src/ --include="*.ts" --include="*.js"
# Flag: verbose error details in responses
grep -rnE "res\.(json|send)\(.*err\." src/ --include="*.ts" --include="*.js"
```

---

### Item 5.2: Permissive CORS Configuration

**Provenance:** OWASP-A02, API-08, CWE-942
**Severity:** Blocker
**Verification:** static

CORS configured with wildcard origin (`*`) combined with credentials, or origin reflected from the request header without validation. Enables cross-site attacks from any domain.

**Vulnerable:**
```typescript
// Wildcard CORS -- any website can make requests
app.use(cors({ origin: "*", credentials: true }));

// Reflected origin -- trusts whatever the browser sends
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});
```

**Secure:**
```typescript
// Explicit allowlist of trusted origins
const ALLOWED_ORIGINS = [
  "https://myapp.com",
  "https://staging.myapp.com",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
```

**Detection:**
```bash
# Flag: wildcard CORS with credentials
grep -rnE "origin.*\*.*credentials|credentials.*origin.*\*" src/ --include="*.ts" --include="*.js"
# Flag: reflected origin
grep -rnE "Allow-Origin.*req\.headers\.origin|origin.*req\.headers" src/ --include="*.ts" --include="*.js"
# Flag: cors({ origin: "*" }) or cors() with no config
grep -rnE "cors\(\s*\)|cors\(\s*\{[^}]*origin.*['\"]?\*" src/ --include="*.ts" --include="*.js"
```

---

### Item 5.3: Missing Security Headers

**Provenance:** OWASP-A02, CWE-693
**Severity:** Warning
**Verification:** static

Application does not set security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options). Browser-level defenses are not activated, leaving users vulnerable to clickjacking, MIME sniffing, and protocol downgrade attacks.

**Vulnerable:**
```typescript
// No security headers set -- browser defaults are permissive
app.get("/", (req, res) => {
  res.send(html);
});

// next.config.js without security headers
module.exports = {
  // No headers() function defined
};
```

**Secure:**
```typescript
// Middleware setting security headers
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.removeHeader("X-Powered-By");
  next();
});

// next.config.js equivalent
module.exports = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

**Detection:**
```bash
# Flag: missing security headers in config
grep -rlE "next\.config|app\.(use|listen)|createServer" src/ --include="*.ts" --include="*.js" | xargs grep -L "Content-Security-Policy\|X-Frame-Options\|Strict-Transport-Security"
```

---

### Item 5.4: Exposed Sensitive Files or Endpoints

**Provenance:** OWASP-A02, CWE-200
**Severity:** Warning
**Verification:** static

Sensitive files (`.env`, `.git/`, debug endpoints, database dumps) accessible via the web server. Attackers discover these through directory enumeration or known path scanning.

**Vulnerable:**
```typescript
// Serving the entire project directory as static files
app.use(express.static(".")); // Exposes .env, .git/, package.json

// Debug endpoint left in production
app.get("/debug/env", (req, res) => {
  res.json(process.env); // Exposes all environment variables
});

// .gitignore missing .env
// .env file committed to repository
```

**Secure:**
```typescript
// Serve only the public directory
app.use(express.static("public"));

// Debug endpoints gated behind auth + environment check
if (process.env.NODE_ENV !== "production") {
  app.get("/debug/env", requireAdmin, (req, res) => {
    res.json({ NODE_ENV: process.env.NODE_ENV });
  });
}
```

**Detection:**
```bash
# Flag: static file serving of root or parent directories
grep -rnE "express\.static\(['\"]\.['\"]\)|express\.static\(process\.cwd\(\)\)" src/ --include="*.ts" --include="*.js"
# Flag: .env not in .gitignore
grep -q "^\.env" .gitignore 2>/dev/null || echo ".env not in .gitignore"
# Flag: debug/test endpoints
grep -rnE "(debug|test|internal|admin).*route\|app\.(get|post).*/(debug|test|internal)" src/ --include="*.ts" --include="*.js"
```

---

## Group 6: API Security

<!-- Populated by Run 02 (4 items: rate limiting, excessive data exposure, unsafe API consumption, business flow abuse) -->

---

## Group 7: Supply Chain & Dependencies

<!-- Populated by Run 02 (3 items: known vulnerabilities, lockfile integrity, typosquatting) -->

---

## Group 8: LLM & AI-Specific Security

<!-- Populated by Run 02 (5 items: prompt injection, sensitive info disclosure, excessive agency, output handling, system prompt leakage) -->

---

## Group 9: Cloud & Infrastructure Security

<!-- Populated by Run 02 (3 items: exposed cloud metadata, public storage buckets, overprivileged IAM) -->

---

## Group 10: Framework-Specific Pitfalls

<!-- Populated by Run 02 (3 items: Next.js server actions, React dangerouslySetInnerHTML, Express error handling) -->
