const { resolve } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('./base'), require.resolve('eslint-config-next')],
  parserOptions: {
    project,
  },
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};
