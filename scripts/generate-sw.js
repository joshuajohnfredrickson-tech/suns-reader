/**
 * Generates public/sw.js from public/sw.template.js by replacing
 * the __BUILD_ID__ placeholder with a unique build identifier.
 *
 * Run before `next build` so each deploy gets a fresh service worker.
 */
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'public', 'sw.template.js');
const outputPath = path.join(__dirname, '..', 'public', 'sw.js');

const buildId = Date.now().toString();
const template = fs.readFileSync(templatePath, 'utf-8');
const output = template.replace(/__BUILD_ID__/g, buildId);

fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`[generate-sw] Generated sw.js with BUILD_ID=${buildId}`);
