import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ThcodeClient} from '../dist/index.js';
const fake = (status, body) => async () => new Response(JSON.stringify(body), {status});
test('ready response is typed and read-only', async () => {
  let called;
  const client = new ThcodeClient('https://backend.example', async (url, options) => {
    called = {url: String(url), options};
    return new Response('{"status":"ready"}', {status:200});
  });
  assert.deepEqual(await client.readiness(), {status:'ready', httpStatus:200});
  assert.equal(called.url, 'https://backend.example/api/ready');
  assert.equal(called.options.method, 'GET');
  assert.equal(called.options.redirect, 'error');
  assert.equal(called.options.headers, undefined);
});
test('503 is not confused with success', async () => {
  assert.deepEqual(await new ThcodeClient('https://backend.example', fake(503, {status:'not_ready'})).readiness(), {status:'not_ready', httpStatus:503});
});
test('reject inconsistent response', async () => {
  await assert.rejects(() => new ThcodeClient('https://backend.example', fake(200, {status:'not_ready'})).readiness());
});
test('reject unexpected HTTP', async () => {
  await assert.rejects(() => new ThcodeClient('https://backend.example', fake(401, {})).readiness());
});
test('reject malformed response', async () => {
  await assert.rejects(() => new ThcodeClient('https://backend.example', fake(200, {})).readiness());
});
test('reject remote HTTP and embedded secrets', () => {
  for (const url of ['http://backend.example', 'https://user:password@backend.example', 'https://backend.example?token=x', 'https://backend.example/other']) {
    assert.throws(() => new ThcodeClient(url));
  }
});
test('accept local testing', async () => {
  assert.equal((await new ThcodeClient('http://localhost:8080', fake(200, {status:'ready'})).readiness()).status, 'ready');
});
