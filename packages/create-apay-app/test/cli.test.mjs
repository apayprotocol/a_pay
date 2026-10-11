import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../bin/index.js');
const tempBase = path.resolve(__dirname, '../../tmp_test_projects');

test.beforeEach(() => {
  fs.mkdirSync(tempBase, { recursive: true });
});

test.afterEach(() => {
  if (fs.existsSync(tempBase)) {
    fs.rmSync(tempBase, { recursive: true, force: true });
  }
});

test('create-apay-app scaffolds Next.js project with custom wallet', () => {
  const projPath = path.join(tempBase, 'test-nextjs-app');
  execSync(`node "${cliPath}" "${projPath}" --template nextjs --receiver 0x1111111111111111111111111111111111111111 --yes`);

  assert.strictEqual(fs.existsSync(path.join(projPath, 'package.json')), true);
  assert.strictEqual(fs.existsSync(path.join(projPath, '.env')), true);
  assert.strictEqual(fs.existsSync(path.join(projPath, 'src/app/page.tsx')), true);
  assert.strictEqual(fs.existsSync(path.join(projPath, 'src/app/api/agent/route.ts')), true);

  const envContent = fs.readFileSync(path.join(projPath, '.env'), 'utf8');
  assert.strictEqual(envContent.includes('0x1111111111111111111111111111111111111111'), true);
});

test('create-apay-app scaffolds FastAPI project with custom wallet', () => {
  const projPath = path.join(tempBase, 'test-fastapi-app');
  execSync(`node "${cliPath}" "${projPath}" --template fastapi --receiver 0x2222222222222222222222222222222222222222 --yes`);

  assert.strictEqual(fs.existsSync(path.join(projPath, 'main.py')), true);
  assert.strictEqual(fs.existsSync(path.join(projPath, 'pyproject.toml')), true);
  assert.strictEqual(fs.existsSync(path.join(projPath, '.env')), true);

  const envContent = fs.readFileSync(path.join(projPath, '.env'), 'utf8');
  assert.strictEqual(envContent.includes('0x2222222222222222222222222222222222222222'), true);
});

test('create-apay-app scaffolds Express project with custom wallet', () => {
  const projPath = path.join(tempBase, 'test-express-app');
  execSync(`node "${cliPath}" "${projPath}" --template express --receiver 0x3333333333333333333333333333333333333333 --yes`);

  assert.strictEqual(fs.existsSync(path.join(projPath, 'server.js')), true);
  assert.strictEqual(fs.existsSync(path.join(projPath, 'package.json')), true);
  assert.strictEqual(fs.existsSync(path.join(projPath, 'public/index.html')), true);

  const envContent = fs.readFileSync(path.join(projPath, '.env'), 'utf8');
  assert.strictEqual(envContent.includes('0x3333333333333333333333333333333333333333'), true);
});
