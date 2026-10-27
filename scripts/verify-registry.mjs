import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
let metadata;
// New npm publications can remain in processing for several minutes.
for (let i = 0; i < 180; i++) {
  const response = await fetch(`https://registry.npmjs.org/${pkg.name}/${pkg.version}`, { cache: 'no-store' });
  if (response.ok) { metadata = await response.json(); break; }
  if (response.status !== 404) throw new Error(`Registry returned ${response.status}`);
  await sleep(5000);
}
assert.equal(metadata?.version, pkg.version, 'Exact package version available');
const response = await fetch(metadata.dist.tarball);
assert.ok(response.ok, 'Published tarball downloadable');
const tarball = Buffer.from(await response.arrayBuffer());
const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`;
assert.equal(integrity, metadata.dist.integrity);
const latest = await (await fetch(`https://registry.npmjs.org/${pkg.name}/latest`)).json();
assert.equal(latest.version, pkg.version, 'latest points to the release');
console.log(`Verified ${pkg.name}@${pkg.version}: latest, tarball download, SHA-512 integrity`);
