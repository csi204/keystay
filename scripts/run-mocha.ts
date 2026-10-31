import Mocha from 'mocha';
import path from 'node:path';
import fs from 'node:fs';

const mocha = new Mocha({
  timeout: 15000,
  reporter: 'spec',
  color: true,
});

const targetArg = process.argv[2];

const testDir = path.resolve(__dirname, '../tests/mocha');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
  if (!targetArg || file.includes(targetArg)) {
    mocha.addFile(path.join(testDir, file));
  }
}

mocha.loadFilesAsync().then(() => {
  mocha.run((failures) => {
    process.exitCode = failures ? 1 : 0;
  });
}).catch((err) => {
  console.error('Failed to load Mocha test files:', err);
  process.exit(1);
});

