const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const mysql = require('mysql2/promise');

const port = 3600 + Math.floor(Math.random() * 400);
const baseUrl = 'http://127.0.0.1:' + port;
const backendDir = path.join(__dirname, '..');
const databaseName = process.env.DB_NAME || 'jansuvida';
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName
};

let child;
let serverOutput = '';

async function resetDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'mysql',
    multipleStatements: true
  });
  try {
    await connection.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(databaseName));
    const schema = fs.readFileSync(path.join(backendDir, 'database/schema.sql'), 'utf8');
    await connection.query(schema);
  } finally {
    await connection.end();
  }
}

function waitForServer(timeoutMs) {
  const limit = timeoutMs || 20000;
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      if (child && child.exitCode !== null) {
        clearInterval(timer);
        reject(new Error('API server exited early: ' + serverOutput));
        return;
      }
      if (Date.now() - started > limit) {
        clearInterval(timer);
        reject(new Error('API server did not become healthy: ' + serverOutput));
        return;
      }
      try {
        const response = await fetch(baseUrl + '/api/health');
        if (response.status === 200) {
          clearInterval(timer);
          resolve();
        }
      } catch (_) {}
    }, 200);
  });
}

async function request(route, options) {
  const config = options || {};
  const headers = {};
  if (config.token) headers.Authorization = 'Bearer ' + config.token;
  if (config.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(baseUrl + route, {
    method: config.method || 'GET',
    headers,
    body: config.body === undefined ? undefined : JSON.stringify(config.body)
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

async function run() {
  await resetDatabase();

  const env = {
    ...process.env,
    PORT: String(port),
    DB_HOST: dbConfig.host,
    DB_PORT: String(dbConfig.port),
    DB_USER: dbConfig.user,
    DB_PASSWORD: dbConfig.password,
    DB_NAME: databaseName,
    SESSION_SECRET: process.env.SESSION_SECRET || 'jansuvida-ci-integration-secret',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'ci-admin',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'ci-admin-password'
  };
  child = spawn(process.execPath, ['src/server.js'], {
    cwd: backendDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
  child.stderr.on('data', chunk => { serverOutput += chunk.toString(); });

  try {
    await waitForServer();

    const mobile = '9' + String(Date.now()).slice(-9);
    let result = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'CI Customer', mobile, email: 'ci@example.test', password: 'StrongPass123!' }
    });
    assert.equal(result.status, 201, 'Customer registration must succeed');
    const customerId = result.payload.customer.id;

    result = await request('/api/auth/login', {
      method: 'POST',
      body: { mobile, password: 'WrongPass123!' }
    });
    assert.equal(result.status, 401, 'Invalid customer password must be rejected');

    result = await request('/api/auth/login', {
      method: 'POST',
      body: { mobile, password: 'StrongPass123!' }
    });
    assert.equal(result.status, 200, 'Customer login must succeed');
    const customerToken = result.payload.accessToken;
    assert.ok(customerToken, 'Customer login must return a session token');

    result = await request('/api/profile', { token: customerToken });
    assert.equal(result.status, 200, 'Customer profile GET must succeed');
    assert.equal(result.payload.customer.id, customerId);

    result = await request('/api/profile', {
      method: 'PATCH',
      token: customerToken,
      body: {
        name: 'CI Customer Updated',
        mobile,
        email: 'updated@example.test',
        address: 'Integration Test Road',
        pincode: '205001'
      }
    });
    assert.equal(result.status, 200, 'Customer profile update must succeed');
    assert.equal(result.payload.customer.pincode, '205001');

    result = await request('/api/admin/login', {
      method: 'POST',
      body: { username: 'wrong-admin', password: 'wrong-password' }
    });
    assert.equal(result.status, 401, 'Invalid admin credentials must be rejected');

    result = await request('/api/admin/login', {
      method: 'POST',
      body: {
        username: env.ADMIN_USERNAME,
        password: env.ADMIN_PASSWORD
      }
    });
    assert.equal(result.status, 200, 'Admin login must succeed');
    const adminToken = result.payload.accessToken;
    assert.ok(adminToken, 'Admin login must return a session token');
    assert.equal(result.payload.admin.role, 'admin');

    result = await request('/api/admin/applications');
    assert.equal(result.status, 401, 'Admin Applications must reject anonymous requests');

    result = await request('/api/admin/applications', { token: customerToken });
    assert.equal(result.status, 401, 'Admin Applications must reject customer sessions');

    result = await request('/api/admin/dashboard/stats', { token: customerToken });
    assert.equal(result.status, 401, 'Admin Dashboard must reject customer sessions');

    result = await request('/api/admin/manage/customers', { token: adminToken });
    assert.equal(result.status, 200, 'Admin customer management must accept admin sessions');
    assert.ok(result.payload.customers.some(customer => customer.id === customerId));

    result = await request('/api/admin/dashboard/stats', { token: adminToken });
    assert.equal(result.status, 200, 'Admin dashboard stats must load');
    assert.ok(result.payload.stats.customers >= 1);

    const connection = await mysql.createConnection(dbConfig);
    let serviceId;
    try {
      const [services] = await connection.query('SELECT id FROM services WHERE slug=? LIMIT 1', ['pan-card']);
      assert.ok(services.length, 'Seed PAN service must exist');
      serviceId = services[0].id;
    } finally {
      await connection.end();
    }

    result = await request('/api/applications', {
      method: 'POST',
      token: customerToken,
      body: { serviceId, details: { purpose: 'CI integration test' } }
    });
    assert.equal(result.status, 201, 'Customer application creation must succeed');
    const applicationId = result.payload.application.id;
    const applicationNo = result.payload.application.applicationNo;

    result = await request('/api/applications');
    assert.equal(result.status, 401, 'Customer Applications must reject anonymous requests');

    result = await request('/api/applications', { token: customerToken });
    assert.equal(result.status, 200, 'Customer application list must load');

    result = await request('/api/applications/' + applicationNo, { token: customerToken });
    assert.equal(result.status, 200, 'Customer application detail must load');
    assert.equal(result.payload.application.payment_status, 'none');

    result = await request('/api/payments', {
      method: 'POST',
      token: customerToken,
      body: { applicationId, method: 'cash' }
    });
    assert.equal(result.status, 201, 'Customer payment request must be created');
    const paymentId = result.payload.payment.id;
    assert.equal(result.payload.payment.status, 'pending');

    result = await request('/api/applications', { token: customerToken });
    assert.equal(result.payload.applications[0].payment_status, 'pending');

    result = await request('/api/applications/' + applicationNo, { token: customerToken });
    assert.equal(result.payload.application.payment_status, 'pending');

    result = await request('/api/payments', { token: customerToken });
    assert.equal(result.status, 200, 'Customer payment list must load');

    result = await request('/api/admin/applications', { token: adminToken });
    assert.equal(result.status, 200, 'Admin Applications must accept admin sessions');
    assert.equal(result.payload.applications[0].payment_status, 'pending');

    result = await request('/api/admin/applications/' + applicationNo, { token: adminToken });
    assert.equal(result.status, 200, 'Admin application detail must load');
    assert.equal(result.payload.payments[0].status, 'pending');

    result = await request('/api/admin/manage/applications/' + applicationId + '/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'processing' }
    });
    assert.equal(result.status, 404, 'Legacy Admin status route must not bypass the guarded route');

    result = await request('/api/admin/applications/' + applicationId + '/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'processing' }
    });
    assert.equal(result.status, 409, 'Application processing must require verified payment');

    result = await request('/api/admin/payments/' + paymentId + '/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'verified', remarks: 'CI test verification' }
    });
    assert.equal(result.status, 200, 'Admin must be able to verify a pending payment');

    result = await request('/api/admin/applications/' + applicationId + '/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'processing' }
    });
    assert.equal(result.status, 200, 'Verified payment must allow application processing');

    result = await request('/api/admin/applications/' + applicationId + '/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'completed' }
    });
    assert.equal(result.status, 409, 'Invalid application transition must be rejected');

    result = await request('/api/admin/applications/' + applicationId + '/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'approved' }
    });
    assert.equal(result.status, 200, 'Processing application may be approved');

    result = await request('/api/admin/applications/' + applicationId + '/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'completed' }
    });
    assert.equal(result.status, 200, 'Approved application may be completed');

    result = await request('/api/applications', { token: customerToken });
    assert.equal(result.status, 200);
    assert.equal(result.payload.applications[0].status, 'completed');
    assert.equal(result.payload.applications[0].payment_status, 'verified');

    result = await request('/api/admin/notifications/send', {
      method: 'POST',
      token: adminToken,
      body: { customerId, title: 'CI notification', message: 'Integration test message', type: 'info' }
    });
    assert.equal(result.status, 200, 'Admin customer notification must send');

    result = await request('/api/notifications', { token: customerToken });
    assert.equal(result.status, 200, 'Customer notifications must load');
    assert.ok(result.payload.notifications.some(notification => notification.title === 'CI notification'));

    result = await request('/api/admin/payments', { token: adminToken });
    assert.equal(result.status, 200, 'Admin payments list must load');

    result = await request('/api/admin/documents', { token: adminToken });
    assert.equal(result.status, 200, 'Admin documents list must load');

    console.log('Integration test passed: customer registration/login/session, profile, dashboard APIs, Admin login/role, protected Admin Applications, payment verification and application lifecycle.');
  } finally {
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolve => {
        child.once('exit', resolve);
        setTimeout(resolve, 3000);
      });
    }
  }
}

run().then(async () => {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'mysql'
  });
  try {
    await connection.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(databaseName));
  } finally {
    await connection.end();
  }
}).catch(error => {
  console.error(error);
  if (serverOutput) console.error('API server output:\\n' + serverOutput);
  process.exitCode = 1;
});
