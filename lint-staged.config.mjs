import path from 'node:path';

export default {
  '*.{ts,js,cjs,mjs,json,md,yml,yaml}': (files) => {
    const supported = files.filter((file) => {
      const relative = path.relative(process.cwd(), file).split(path.sep);
      return (
        !relative.some((part) =>
          [
            'node_modules',
            'dist',
            'coverage',
            'build',
            'contracts',
            'vendor',
            'public',
          ].includes(part)
        ) &&
        !['openapi.json', 'package-lock.json'].includes(relative.at(-1)) &&
        !(relative[0] === '.husky' && relative[1] === '_')
      );
    });
    return supported.length
      ? `prettier --write ${supported.map((file) => JSON.stringify(file)).join(' ')}`
      : [];
  },
};
