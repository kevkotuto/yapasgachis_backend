const moduleAlias = require('module-alias');
const path = require('path');

moduleAlias.addAliases({
  '@': path.join(__dirname, 'dist'),
  '@api': path.join(__dirname, 'dist/api'),
  '@core': path.join(__dirname, 'dist/core'),
  '@infrastructure': path.join(__dirname, 'dist/infrastructure'),
  '@middleware': path.join(__dirname, 'dist/middleware'),
  '@utils': path.join(__dirname, 'dist/utils'),
  '@config': path.join(__dirname, 'dist/config'),
  '@types': path.join(__dirname, 'dist/types')
});

require('./dist/server');
