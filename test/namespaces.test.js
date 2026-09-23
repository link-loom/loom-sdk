const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const path = require('node:path');

const FIXTURE_ROOT = path.join(__dirname, 'fixtures', 'namespaced-service');

let dependencies;
let baseUrl;

const findFreePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const request = async (method, route, headers = {}, body) => {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { status: response.status, json };
};

before(async () => {
  const port = await findFreePort();

  process.env.NODE_CONFIG_DIR = path.join(FIXTURE_ROOT, 'config');
  process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';
  process.env.PORT = `${port}`;
  baseUrl = `http://localhost:${port}`;

  const { Loom } = require('../index');
  dependencies = await new Loom({ root: FIXTURE_ROOT }).ignite();

  await new Promise((resolve) => setTimeout(resolve, 100));
});

after(() => {
  dependencies?.httpServer?.close();
});

test('the default namespace keeps working as before', async () => {
  const response = await request('GET', '/probe/visible');

  assert.equal(response.status, 200);
  assert.equal(response.json.result.namespace, 'default');
  assert.deepEqual(response.json.result.services, ['DefaultProbeService']);
  assert.equal(response.json.result.marker, 'default');
});

test('only valid, enabled namespaces are loaded', () => {
  const names = dependencies.NamespacesModule.namespaces.map(
    (namespaceContext) => namespaceContext.name,
  );

  assert.deepEqual(names, ['alpha', 'beta']);
});

test('a namespace has its own services, types and dependencies', async () => {
  const response = await request('GET', '/alpha/item/visible', {
    'x-token': 'good',
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.result.namespace, 'alpha');
  assert.equal(response.json.result.prefix, '/alpha');
  assert.deepEqual(response.json.result.services, ['AlphaItemService']);
  assert.equal(response.json.result.marker, 'alpha');
  assert.equal(response.json.result.builtInType, 'string');
  assert.equal(response.json.result.hasGlobalExpress, true);
  assert.equal(response.json.result.spreadKeepsNamespace, 'alpha');
});

test('route auth: missing credentials are rejected and the principal reaches the handler', async () => {
  const rejected = await request('GET', '/alpha/item/visible');
  const accepted = await request('GET', '/alpha/item/visible', {
    'x-token': 'good',
  });

  assert.equal(rejected.status, 401);
  assert.equal(rejected.json.success, false);
  assert.deepEqual(accepted.json.result.principal, { subject: 'tester' });
});

test('route auth: public routes stay open', async () => {
  const response = await request('GET', '/alpha/item/public');

  assert.equal(response.status, 200);
  assert.equal(response.json.result.principal, null);
});

test('route auth: an unregistered handler fails closed', async () => {
  const response = await request('GET', '/alpha/item/misconfigured', {
    'x-token': 'good',
  });

  assert.equal(response.status, 500);
  assert.equal(response.json.success, false);
});

test('services choose their database by argument; the default namespace keeps the configured one', async () => {
  await request(
    'POST',
    '/alpha/item/',
    { 'x-token': 'good' },
    { name: 'from-alpha' },
  );
  await request('POST', '/probe/items', {}, { name: 'from-default' });

  const adapter = dependencies.database.default.adapter;

  assert.deepEqual(adapter.store['alpha-db'].item, [
    { name: 'from-alpha', created_by: 'tester' },
  ]);
  assert.deepEqual(adapter.store['default-db'].item, [
    { name: 'from-default' },
  ]);
});

test('a namespace with an empty prefix is mounted at the root', async () => {
  const response = await request('GET', '/beta-root/ping');

  assert.equal(response.status, 200);
  assert.equal(response.json.result.namespace, 'beta');
  assert.equal(response.json.result.marker, 'beta');
  assert.deepEqual(response.json.result.services, []);
});

test('namespace routes live only under their prefix', async () => {
  assert.equal((await request('GET', '/item/public')).status, 404);
  assert.equal((await request('GET', '/alpha/nothing-here')).status, 404);
});

test('each namespace publishes its own OpenAPI document', async () => {
  const alphaDocument = await request('GET', '/alpha/open-api.json');
  const defaultDocument = await request('GET', '/open-api.json');

  assert.equal(alphaDocument.status, 200);
  assert.ok(alphaDocument.json.servers[0].url.endsWith('/alpha'));
  assert.equal(defaultDocument.status, 200);
  assert.ok(!defaultDocument.json.servers[0].url.endsWith('/alpha'));
});
