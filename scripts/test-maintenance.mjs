import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(path.join(os.tmpdir(), 'uploader-maintenance-'));
const env = { ...process.env };
for (const key of ['CI', 'HUSKY', 'NODE_ENV', 'npm_config_omit'])
  delete env[key];
Object.assign(env, {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Maintenance Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Maintenance Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
});

function run(cwd, command, args, overrides = {}, expected = 0) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...env, ...overrides },
    encoding: 'utf8',
    timeout: 180_000,
  });
  assert.ifError(result.error);
  assert.equal(
    result.status,
    expected,
    `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`
  );
  return result.stdout.trim();
}

function write(cwd, name, content) {
  const target = path.join(cwd, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function fixture(name, git = false) {
  const cwd = path.join(temporary, name);
  mkdirSync(cwd);
  for (const file of ['package.json', 'package-lock.json']) {
    copyFileSync(path.join(root, file), path.join(cwd, file));
  }
  if (git) {
    run(cwd, 'git', ['init', '--quiet']);
    write(
      cwd,
      '.husky/pre-commit',
      readFileSync(path.join(root, '.husky/pre-commit'))
    );
  }
  return cwd;
}

try {
  const cwd = fixture('hooks', true);
  symlinkSync(path.join(root, 'node_modules'), path.join(cwd, 'node_modules'));
  for (const file of [
    '.prettierrc',
    '.prettierignore',
    'lint-staged.config.mjs',
    'eslint.config.mjs',
    '.github/workflows/checks.yml',
  ]) {
    write(cwd, file, readFileSync(path.join(root, file)));
  }
  write(cwd, '.gitignore', 'node_modules/\n.husky/_/\n');
  write(cwd, 'src/staged file.ts', 'export const staged = { value: 0 };\n');
  write(cwd, 'test/untouched.ts', 'export const untouched = true;\n');
  write(cwd, 'scripts/placeholder.mjs', 'export const fixture = true;\n');
  run(cwd, 'npm', ['run', 'prepare']);
  assert.equal(run(cwd, 'git', ['config', 'core.hooksPath']), '.husky/_');
  assert.ok(existsSync(path.join(cwd, '.husky/_/pre-commit')));
  run(cwd, 'git', ['add', '.']);
  run(cwd, 'git', ['commit', '--quiet', '-m', 'fixture baseline'], {
    HUSKY: '0',
  });

  write(cwd, 'src/staged file.ts', 'export const staged={value:1}\n');
  run(cwd, 'git', ['add', 'src/staged file.ts']);
  write(
    cwd,
    'src/staged file.ts',
    'export const staged={value:1}\n// unstaged canary\n'
  );
  const unstaged = 'export const untouched=false\n';
  write(cwd, 'test/untouched.ts', unstaged);
  run(cwd, 'git', ['commit', '--quiet', '-m', 'partial staging fixture']);
  assert.equal(
    run(cwd, 'git', ['show', 'HEAD:src/staged file.ts']),
    'export const staged = { value: 1 };'
  );
  assert.equal(
    readFileSync(path.join(cwd, 'src/staged file.ts'), 'utf8'),
    'export const staged = { value: 1 };\n// unstaged canary\n'
  );
  assert.equal(
    readFileSync(path.join(cwd, 'test/untouched.ts'), 'utf8'),
    unstaged
  );
  console.log(
    'PASS hook formatting, spaces in paths and partial/unstaged preservation'
  );

  const generated = 'not valid typescript {{{';
  write(cwd, 'contracts/generated.ts', generated);
  run(cwd, 'git', ['add', 'contracts/generated.ts']);
  run(cwd, 'git', ['commit', '--quiet', '-m', 'excluded generated fixture']);
  assert.equal(
    readFileSync(path.join(cwd, 'contracts/generated.ts'), 'utf8'),
    generated
  );
  console.log('PASS generated files excluded from staged formatter');

  const head = run(cwd, 'git', ['rev-parse', 'HEAD']);
  const invalid = 'export const broken = {{{\n';
  write(cwd, 'src/staged file.ts', invalid);
  run(cwd, 'git', ['add', 'src/staged file.ts']);
  run(cwd, 'git', ['commit', '--quiet', '-m', 'must fail'], {}, 1);
  assert.equal(run(cwd, 'git', ['rev-parse', 'HEAD']), head);
  assert.equal(
    readFileSync(path.join(cwd, 'src/staged file.ts'), 'utf8'),
    invalid
  );
  assert.equal(
    run(cwd, 'git', ['show', ':src/staged file.ts']),
    invalid.trim()
  );
  console.log(
    'PASS formatter failure blocks commit and restores index/worktree'
  );

  write(cwd, 'src/staged file.ts', 'export const staged={value:2}\n');
  write(cwd, 'test/untouched.ts', 'export const untouched = true;\n');
  const before = readFileSync(path.join(cwd, 'src/staged file.ts'), 'utf8');
  run(cwd, 'npm', ['run', 'format:check'], {}, 1);
  assert.equal(
    readFileSync(path.join(cwd, 'src/staged file.ts'), 'utf8'),
    before
  );
  console.log('PASS actual format:check rejects drift without modifying files');

  if (process.argv.includes('--installs')) {
    for (const [name, git, overrides, args] of [
      ['developer', true, {}, []],
      ['ci', true, { CI: 'true' }, []],
      ['no-git-package-only', false, {}, []],
      ['production', true, { NODE_ENV: 'production' }, ['--omit=dev']],
      ['husky-disabled', true, { HUSKY: '0' }, []],
    ]) {
      const install = fixture(name, git);
      run(
        install,
        'npm',
        ['ci', '--offline', '--no-audit', '--no-fund', ...args],
        overrides
      );
      assert.equal(
        existsSync(path.join(install, '.husky/_/pre-commit')),
        name === 'developer'
      );
      if (name === 'production') {
        assert.equal(
          existsSync(path.join(install, 'node_modules/husky')),
          false
        );
      }
      console.log(`PASS clean ${name} npm ci with lifecycle scripts enabled`);
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
