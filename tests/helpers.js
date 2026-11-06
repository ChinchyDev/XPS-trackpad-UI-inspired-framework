const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const url = (file, hash = '') => pathToFileURL(path.join(root, file)).href + hash;
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
/** Measure the settled state: WebKit freezes colour transitions on off-screen elements, so axe would read a half-way colour. */
const settled = page => page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
module.exports = { url, read, root, settled };
