import { Command } from 'commander';
import * as esbuild from 'esbuild';
import * as path from 'path';
import appRootDir from 'app-root-dir';
import { copy } from 'esbuild-plugin-copy';

// Otherwise the serve port from the previous build might not be fully released.
await new Promise(resolve => setTimeout(resolve, 500));

const root = appRootDir.get();

const logRebuildPlugin: esbuild.Plugin = {
  name: 'rebuild-log',
  // eslint-disable-next-line @typescript-eslint/unbound-method
  setup({ onStart, onEnd }) {
    let t: number;
    onStart(() => {
      t = Date.now();
    });
    onEnd(() => {
      console.log(`Build finished in`, Date.now() - t, 'ms');;
    });
  },
};

const distDir = path.join(root, 'dist');

const program = new Command();
program.option('--watch', 'Rebuild upon change', false);
program.option('--serve', 'Serve using esbuild webserver', false);
program.option('--live-reload', 'Enable live-reload', false);
program.action(async ({ watch, serve, liveReload }: { watch: boolean; serve: boolean; liveReload: boolean; }) => {
  const browserCtx = await esbuild.context({
    platform: 'browser',
    target: 'esnext',
    format: 'esm',
    bundle: true,
    minify: false,
    outdir: distDir,
    entryPoints: [
      { in: 'src/app.ts', out: 'www/app' },
      { in: 'src/app.css', out: 'www/app' },
    ],
    plugins: [
      logRebuildPlugin,
      copy({
        assets: [
          {
            from: [path.join(root, 'node_modules', '@fontsource', 'open-sans', '**', '*400*')],
            to: path.join(distDir, 'www', 'assets', 'fonts', 'open-sans'),
          },
        ],
      }),
    ],
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    sourcemap: 'linked',
    footer: {
      ...(liveReload
        ? {
          js: `if (typeof process !== 'object') { new EventSource('/esbuild').addEventListener('change', () => location.reload()); }`
        }
        : {}
      )
    }
  });

  if (watch) {
    console.log('Starting watch');
    await browserCtx.watch();
  } else {
    await browserCtx.rebuild();
  }

  if (serve) {
    const { hosts, port } = await browserCtx.serve({ servedir: root });
    console.log(`Serving on http://${hosts[0]}:${port}`);
  }

  if (!watch && !serve) {
    await browserCtx.dispose();
  }
}).parse();
