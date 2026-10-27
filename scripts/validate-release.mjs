import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'Use a stable semver release');
if (process.env.GITHUB_REF_TYPE === 'tag') assert.equal(process.env.GITHUB_REF_NAME, `v${pkg.version}`, 'Tag must match package.json');
else assert.equal(process.env.GITHUB_REF_NAME, 'main', 'Manual publish must use main');
execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main']);
console.log(`Release validated: ${pkg.name}@${pkg.version}`);
