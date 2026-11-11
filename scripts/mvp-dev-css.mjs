// Resolve the existing frontend theme/content explicitly when DEV cwd is a private run directory.
// Pure build configuration: no server, database, env loading or production runtime changes.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export async function devCssPlugins(root) {
  const load = relative => import(pathToFileURL(path.join(root, 'frontend', relative)).href);
  const [{ default: tailwind }, { default: autoprefixer }, { default: theme }] = await Promise.all([
    load('node_modules/tailwindcss/lib/index.js'),
    load('node_modules/autoprefixer/lib/autoprefixer.js'),
    load('tailwind.config.js'),
  ]);
  const configuration = {
    ...theme,
    content: theme.content.map(pattern => path.resolve(root, 'frontend', pattern).replaceAll('\\', '/')),
  };
  return [tailwind(configuration), autoprefixer()];
}
