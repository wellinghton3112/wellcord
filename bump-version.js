const fs = require('fs');
let v = process.argv[2];
if (!v) {
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  const parts = pkg.version.split('.').map(Number);
  parts[2] += 1;
  v = parts.join('.');
}
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.version = v;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync('src/lib/version.ts', `export const APP_VERSION = "BETA ${v}";\nexport const APP_NAME = "Wellcord";\n`);
console.log(`Bump para BETA ${v}`);
