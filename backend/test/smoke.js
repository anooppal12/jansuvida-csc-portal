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
      } catch (_) {
        // Keep polling until the server is listening.
      }
    }, 150);
  });
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
  } finally {
    child.kill('SIGTERM');
  }
})().catch((error) => {
  console.error(error);
  child.kill('SIGTERM');
  process.exit(1);
});
