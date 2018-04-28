const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const webpack = require('webpack');
const chokidar = require('chokidar');
const serve = require('webpack-serve');
const Router = require('koa-router');
const convert = require('koa-connect');
const mount = require('koa-mount');
const serveStatic = require('koa-static');
const history = require('connect-history-api-fallback');
const portfinder = require('portfinder');
const MFS = require('memory-fs');
const prepare = require('./prepare');
const createServerConfig = require('./webpack/createServerConfig');
const { createBundleRenderer } = require('vue-server-renderer');
const { applyUserWebpackConfig } = require('./util');

module.exports = async function dev(sourceDir, cliOptions = {}) {
  process.env.NODE_ENV = 'development';
  process.stdout.write('Extracting site metadata...');
  const options = await prepare(sourceDir);

  // setup watchers to update options and dynamically generated files
  const update = () => {
    prepare(sourceDir).catch((err) => {
      console.error(chalk.red(err.stack));
    });
  };

  // watch add/remove of files
  const pagesWatcher = chokidar.watch([
    // path.join(sourceDir, '**/*.vue'),
    path.join(sourceDir, '**/*.vue')
  ], {
    ignored: '.vuepress/**/*.md',
    ignoreInitial: true
  });
  pagesWatcher.on('add', update);
  pagesWatcher.on('unlink', update);
  pagesWatcher.on('addDir', update);
  pagesWatcher.on('unlinkDir', update);

  // watch config file
  const configWatcher = chokidar.watch([
    path.join(sourceDir, '.vuepress/config.js')
  ], { ignoreInitial: true });
  configWatcher.on('change', update);

  // resolve webpack config
  // let config = createClientConfig(options, cliOptions);
  let config = createServerConfig(options, cliOptions);

  // config
  //   .plugin('html')
  //   // using a fork of html-webpack-plugin to avoid it requiring webpack
  //   // internals from an incompatible version.
  //   .use(require('vuepress-html-webpack-plugin'), [{
  //     template: options.layoutTemplate // path.resolve(__dirname, 'app/index.dev.html'),
  //   }]);

  // config
  //   .plugin('site-data')
  //   .use(HeadPlugin, [{
  //     tags: options.siteConfig.head || [],
  //   }]);

  config = config.toConfig();
  const userConfig = options.siteConfig.configureWebpack;
  if (userConfig) {
    config = applyUserWebpackConfig(userConfig, config, false /* isServer */);
  }

  // const stats = await compile([config]);
  const compiler = webpack(config);
  // const mfs = new MFS();
  // const outputPath = path.join(config.output.path, config.output.filename);
  // compiler.outputFileSystem = mfs;
  // compiler.watch({}, (err, stats) => {
  //   if (err) throw err;
  //   stats = stats.toJson();
  //   stats.errors.forEach(err => console.error(err));
  //   stats.warnings.forEach(err => console.warn(err));
  //   // mfs.readFileSync(outputPath, 'utf-8');
  // });

  // webpack-serve hot updates doesn't work properly over 0.0.0.0 on Windows,
  // but localhost does not allow visiting over network :/
  const defaultHost = process.platform === 'win32' ? 'localhost' : '0.0.0.0';
  const host = cliOptions.host || options.siteConfig.host || defaultHost;
  const displayHost = host === defaultHost && process.platform !== 'win32'
    ? 'localhost'
    : host;
  portfinder.basePort = cliOptions.port || options.siteConfig.port || 8080;
  const port = await portfinder.getPortPromise();

  let isFirst = true;
  compiler.hooks.done.tap('michetta', () => {
    if (isFirst) {
      isFirst = false;
      console.log(`\n  Michetta dev server listening at ${
        chalk.cyan(`http://${displayHost}:${port}${options.publicPath}`)
      }\n`);
    } else {
      const time = new Date().toTimeString().match(/^[\d:]+/)[0];
      console.log(`  ${chalk.gray(`[${time}]`)} ${chalk.green('✔')} successfully compiled.`);
    }
  });

  // // ---------- renderer ----------
  // const serverBundle = require(path.resolve(options.outDir, 'manifest/server.json'));
  // // create server renderer using built manifests
  // const renderer = createBundleRenderer(serverBundle, {
  //   // clientManifest,
  //   runInNewContext: false,
  //   inject: false,
  //   template: await fs.readFile(options.layoutTemplate, 'utf-8')
  // });
  // // ---------- /renderer ----------

  const router = new Router();

  // eslint-disable-next-line consistent-return, no-param-reassign
  router.get('*', (ctx, next) => {
    const context = {
      url: ctx.url,
      lang: 'en'
    };

    const serverBundle = require(path.resolve(options.outDir, 'manifest/server.json'));
    // const serverBundle = mfs.readFileSync(path.resolve(options.outDir, 'manifest/server.json'), 'utf-8');

    // create server renderer using built manifests
    const renderer = createBundleRenderer(serverBundle, {
      // clientManifest,
      runInNewContext: false,
      inject: false,
      template: fs.readFile(options.layoutTemplate, 'utf-8')
    });

    if (!renderer) {
      return ctx.res.end('waiting for compilation... refresh in a moment.');
    }

    renderer.renderToString(context, (err, html) => {
      // handle error...
      if (err) {
        console.error(chalk.red(`Error rendering ${err}:`));
        throw err;
      }

      ctx.type = 'html';
      ctx.body = html;
      next();
    });
  });

  const nonExistentDir = path.resolve(__dirname, 'non-existent');
  await serve({
    // avoid project cwd from being served. Otherwise if the user has index.html
    // in cwd it would break the server
    content: [nonExistentDir],
    // content: path.resolve(sourceDir, '.vuepress/dist'),
    compiler,
    host,
    dev: { logLevel: 'warn' },
    hot: { logLevel: 'error' },
    logLevel: 'error',
    port,
    add: (app, middleware) => {
      // since we're manipulating the order of middleware added, we need to handle
      // adding these two internal middleware functions.
      middleware.webpack();
      middleware.content();

      const userPublic = path.resolve(sourceDir, '.vuepress/public');
      // respect base when serving static files...
      if (fs.existsSync(userPublic)) {
        app.use(mount(options.publicPath, serveStatic(userPublic)));
      }

      app.use(convert(history({
        rewrites: [
          { from: /\.html$/, to: '/' }
        ]
      })));

      // router *must* be the last middleware added
      app.use(router.routes());
    }
  });


  /**
   * Compile Webpack
   * @param config
   * @returns {Promise<any>}
   */
  function compile(config) {
    return new Promise((resolve, reject) => {
      webpack(config, (err, stats) => {
        if (err) {
          return reject(err);
        }
        if (stats.hasErrors()) {
          stats.toJson().errors.forEach((err) => {
            console.error(err);
          });
          reject(new Error('Failed to compile with errors.'));
          return;
        }
        resolve(stats.toJson({ modules: false }));
      });
    });
  }
};
