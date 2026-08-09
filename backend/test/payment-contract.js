const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const payments = fs.readFileSync(path.join(__dirname, '../src/payments.js'), 'utf8');
const adminPayments = fs.readFileSync(path.join(__dirname, '../src/admin-payments.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8');

assert.match(payments, /router\.post\('\/'/);
assert.match(payments, /requireCustomer/);
assert.match(payments, /\['upi', 'cash'\]/);
assert.match(payments, /status.*pending/);
assert.match(payments, /router\.get\('\/'/);

assert.match(adminPayments, /requireAdmin/);
assert.match(adminPayments, /router\.patch\('\/:id\/status'/);
assert.match(adminPayments, /\['verified','rejected'\]/);
assert.match(adminPayments, /INSERT INTO notifications/);

assert.match(server, /app\.use\('\/api\/payments'/);
assert.match(server, /app\.use\('\/api\/admin\/payments'/);

console.log('Payment API contract test passed');
