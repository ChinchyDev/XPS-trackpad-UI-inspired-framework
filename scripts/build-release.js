// Builds the shareable zip: release/EdgeLit/ and release/EdgeLit-<version>.zip
//   npm run build:release
// Contents: the framework WITHOUT font files (Google Fonts, online only), DESIGN.md, README, user guide, how-it-works, notice, licence, and three runnable examples.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { build } = require('./build-kit');
const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const outDir = path.join(root, 'release'), pkgDir = path.join(outDir, 'EdgeLit'), zip = path.join(outDir, `EdgeLit-${version}.zip`);

const files = build('release');
files.set('README.md', fs.readFileSync(path.join(root, 'docs-src/README.md')).toString().replace(/Version \d+\.\d+\.\d+\./, `Version ${version}.`));
files.set('docs/USER-GUIDE.md', fs.readFileSync(path.join(root, 'docs-src/USER-GUIDE.md')));
files.set('docs/HOW-IT-WORKS.md', fs.readFileSync(path.join(root, 'docs-src/HOW-IT-WORKS.md')));
files.set('NOTICE.md', fs.readFileSync(path.join(root, 'docs-src/NOTICE.md')));
files.set('LICENSE.txt', fs.readFileSync(path.join(root, 'docs-src/LICENSE.txt')).toString().replace(/version \d+\.\d+\.\d+/, `version ${version}`));
// demos live in examples/, so their local asset links point one level up
const up = h => h.replace(/(href|src)="(edgelit[^"]*\.(?:css|js))"/g, '$1="../$2"');
for (const d of ['garden.html', 'dashboard.html']) files.set('examples/' + d, up(fs.readFileSync(path.join(root, d), 'utf8')));

fs.rmSync(outDir, { recursive: true, force: true });
for (const [f, buf] of files) { const p = path.join(pkgDir, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); }
// bsdtar (ships with Windows 10+ and macOS) writes a standard zip with forward-slash entry names. PowerShell 5.1's Compress-Archive writes backslashes, which breaks unzip on Mac and Linux.
if (process.platform === 'linux') execFileSync('zip', ['-rq', zip, 'EdgeLit'], { cwd: outDir, stdio: 'inherit' });
else execFileSync(process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe') : 'tar', ['-a', '-c', '-f', path.basename(zip), 'EdgeLit'], { cwd: outDir, stdio: 'inherit' });   // explicit System32 path: Git Bash's GNU tar reads "F:" as a remote host
console.log(`release: ${files.size} files, ${(fs.statSync(zip).size / 1024).toFixed(0)} KB -> ${path.relative(root, zip)}`);
module.exports = { zip, pkgDir };
