/**
 * Integration tests for build-hooks.js and check-dist-sync.js
 *
 * These share the same dist files, so they must run in one file
 * to avoid race conditions when test files run in parallel.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BUILD_SCRIPT = path.join(ROOT, 'scripts', 'build-hooks.js');
const CHECK_SCRIPT = path.join(ROOT, 'scripts', 'check-dist-sync.js');
const HOOKS_DIR = path.join(ROOT, 'hooks');
const DIST_DIR = path.join(HOOKS_DIR, 'dist');
const DIST_FILE = path.join(DIST_DIR, 'ace-statusline.js');
const SOURCE_FILE = path.join(HOOKS_DIR, 'ace-statusline.js');
const EXPECTED_HOOKS = ['ace-check-update.js', 'ace-statusline.js'];

// ─── build-hooks ───

describe('build-hooks', () => {
  it('runs successfully', () => {
    const result = execSync(`node "${BUILD_SCRIPT}"`, { encoding: 'utf-8', cwd: ROOT });
    assert.ok(result.includes('Build complete'));
  });

  it('creates dist directory', () => {
    assert.ok(fs.existsSync(DIST_DIR));
  });

  it('copies all expected hooks to dist', () => {
    for (const hook of EXPECTED_HOOKS) {
      const distPath = path.join(DIST_DIR, hook);
      assert.ok(fs.existsSync(distPath), `Expected ${hook} in dist/`);
    }
  });

  it('dist files match source files after build', () => {
    for (const hook of EXPECTED_HOOKS) {
      const source = fs.readFileSync(path.join(HOOKS_DIR, hook), 'utf-8');
      const dist = fs.readFileSync(path.join(DIST_DIR, hook), 'utf-8');
      assert.equal(source, dist, `${hook} should be identical in source and dist`);
    }
  });

  it('recovers from missing dist directory', () => {
    const backups = {};

    try {
      for (const hook of EXPECTED_HOOKS) {
        const distPath = path.join(DIST_DIR, hook);
        if (fs.existsSync(distPath)) {
          backups[hook] = fs.readFileSync(distPath, 'utf-8');
        }
      }

      fs.rmSync(DIST_DIR, { recursive: true });
      assert.ok(!fs.existsSync(DIST_DIR));

      const result = execSync(`node "${BUILD_SCRIPT}"`, { encoding: 'utf-8', cwd: ROOT });
      assert.ok(result.includes('Build complete'));
      assert.ok(fs.existsSync(DIST_DIR));

      for (const hook of EXPECTED_HOOKS) {
        assert.ok(fs.existsSync(path.join(DIST_DIR, hook)));
      }
    } finally {
      if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR, { recursive: true });
      }
      for (const [hook, content] of Object.entries(backups)) {
        fs.writeFileSync(path.join(DIST_DIR, hook), content);
      }
    }
  });
});

// ─── check-dist-sync ───

describe('check-dist-sync', () => {
  it('passes when dist files are in sync', () => {
    // Ensure files are in sync first
    execSync(`node "${BUILD_SCRIPT}"`, { encoding: 'utf-8', cwd: ROOT });

    const result = execSync(`node "${CHECK_SCRIPT}"`, { encoding: 'utf-8', cwd: ROOT });
    assert.ok(result.includes('in sync'));
  });

  it('fails when a dist file is out of sync', () => {
    const original = fs.readFileSync(DIST_FILE, 'utf-8');

    try {
      fs.writeFileSync(DIST_FILE, original + '\n// test modification');

      assert.throws(
        () => execSync(`node "${CHECK_SCRIPT}"`, { encoding: 'utf-8', cwd: ROOT }),
        (err) => {
          assert.ok(err.stdout.includes('out of sync') || err.stderr.includes('out of sync'));
          assert.equal(err.status, 1);
          return true;
        }
      );
    } finally {
      fs.writeFileSync(DIST_FILE, original);
    }
  });

  it('fails when a dist file is missing', () => {
    const original = fs.readFileSync(DIST_FILE, 'utf-8');

    try {
      fs.unlinkSync(DIST_FILE);

      assert.throws(
        () => execSync(`node "${CHECK_SCRIPT}"`, { encoding: 'utf-8', cwd: ROOT }),
        (err) => {
          assert.ok(err.stdout.includes('does not exist') || err.stderr.includes('does not exist'));
          assert.equal(err.status, 1);
          return true;
        }
      );
    } finally {
      fs.writeFileSync(DIST_FILE, original);
    }
  });

  it('source and dist files actually match', () => {
    const source = fs.readFileSync(SOURCE_FILE, 'utf-8');
    const dist = fs.readFileSync(DIST_FILE, 'utf-8');
    assert.equal(source, dist);
  });
});
