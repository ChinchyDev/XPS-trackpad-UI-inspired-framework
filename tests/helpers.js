const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const url = (file, hash = '') => pathToFileURL(path.join(root, file)).href + hash;
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
module.exports = { url, read, root };
