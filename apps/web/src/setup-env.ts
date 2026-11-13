import path from 'node:path';

if (process.cwd().endsWith('apps/web') || process.cwd().endsWith('apps\\web')) {
  process.chdir(path.resolve(process.cwd(), '../..'));
}
