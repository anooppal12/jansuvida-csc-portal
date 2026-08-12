const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const port = 3100 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;

const child = spawn(process.execPath, ['src/server.js'], {
  cwd: __dirname + '/..',
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });

function waitForServer(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Server did not start in time. Output: ${output}`));
        return;
      }
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        clearInterval(timer);
        resolve(response);
      } catch (_) {}
    }, 150);
  });
}

async function assertProtected(path, label) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.ok([401, 403].includes(response.status), `${label} should require authentication, got ${response.status}`);
}

async function assertAdminApplicationContract() {
  const source = require('node:fs').readFileSync(__dirname + '/../src/admin-applications.js', 'utf8');
  for (const contract of [
    "router.use(requireAdmin)",
    "router.get('/')",
    "router.get('/:applicationNo')",
    "router.patch('/:id/status')",
    "A verified payment is required before processing the application",
    "INSERT INTO notifications",
  ]) {
    assert.ok(source.includes(contract), `Admin application contract missing: ${contract}`);
  }
  console.log('Smoke test passed: admin application status/payment/notification contract is present');
}

(async () => {
  try {
    const response = await waitForServer();
    assert.ok([200, 503].includes(response.status), `Unexpected health status: ${response.status}`);
    const body = await response.json();
    assert.equal(typeof body.ok, 'boolean');
    assert.ok(body.database);
    assert.ok(body.schema);
    console.log(`Smoke test passed: /api/health returned ${response.status}`);

    await assertProtected('/api/applications', 'Applications API');
    await assertProtected('/api/payments', 'Payments API');
    await assertProtected('/api/profile', 'Profile API');
    await assertProtected('/api/notifications', 'Notifications API');
    await assertProtected('/api/admin/applications', 'Admin Applications API');
    await assertProtected('/api/admin/payments', 'Admin Payments API');
    console.log('Smoke test passed: customer and admin protected routes require authentication');

    await assertAdminApplicationContract();
  } finally {
    child.kill('SIGTERM');
  }
})().catch((error) => {
  console.error(error);
  child.kill('SIGTERM');
  process.exit(1);
});
