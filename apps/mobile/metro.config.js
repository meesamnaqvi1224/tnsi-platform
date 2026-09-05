const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm workspace support: workspace dependencies (@tnsi/*) live outside
// this app's own node_modules, so Metro needs to watch the whole monorepo
// and look up modules from both this app's node_modules and the workspace
// root's. Hierarchical lookup must stay ON (unlike the npm/yarn hoisted
// monorepo guides that disable it): pnpm nests each package's own
// dependencies inside its own .pnpm virtual-store node_modules rather than
// hoisting everything to one flat tree, so Metro has to keep walking up
// from each file's own directory - e.g. to find @expo/metro-runtime inside
// expo-router's own node_modules - and disabling that breaks resolution.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
