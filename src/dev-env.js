const fs = require('node:fs');
const path = require('node:path');

const names = {
  GEMINI_API_KEY: 'gemini',
  REACT_APP_GEMINI_API_KEY: 'gemini',
  DEEPGRAM_API_KEY: 'deepgram',
  REACT_APP_DEEPGRAM_API_KEY: 'deepgram'
};

function parseDevKeys(contents) {
  const found = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || !names[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (value && value.length <= 1000) found[names[match[1]]] = value;
  }
  return found;
}

function loadDevKeys(appPath) {
  let fileKeys = {};
  try { fileKeys = parseDevKeys(fs.readFileSync(path.join(appPath, '.env'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return {
    gemini: process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || fileKeys.gemini || '',
    deepgram: process.env.DEEPGRAM_API_KEY || process.env.REACT_APP_DEEPGRAM_API_KEY || fileKeys.deepgram || ''
  };
}

module.exports = {parseDevKeys, loadDevKeys};
