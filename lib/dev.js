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

  config = config.toConfig();
  const userConfig = options.siteConfig.configureWebpack;
  if (userConfig) {
    config = applyUserWebpackConfig(userConfig, config, false /* isServer */);
  }

  // const stats = await compile([config]);
  const compiler = webpack(config);

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


  const router = new Router();


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


      let renderer;
      const readyPromise = require('./dev-server')(config, app, (bundle) => {
        // create server renderer using built manifests
        renderer = createBundleRenderer(bundle, {
          // clientManifest,
          runInNewContext: false,
          inject: false,
          template: fs.readFile(options.layoutTemplate, 'utf-8')
        });
      });

      // eslint-disable-next-line consistent-return, no-param-reassign
      app.use(async (ctx, next) => {
        try {
          await readyPromise.then(() => {
            const { res, req } = ctx;

            if (!renderer) {
              console.log('waiting for compilation... refresh in a moment.');
              return res.end('waiting for compilation... refresh in a moment.');
            }

            console.log(`req.url: ${req.url}`);

            const context = {
              url: req.url,
              lang: 'en'
            };

            renderer.renderToString(context, (err, html) => {
              // handle error...
              if (err) {
                console.error(chalk.red(`Error rendering ${err}:`));
                throw err;
              }

              // console.log(`*** html: \n${html}`);

              ctx.type = 'html';
              ctx.body = html;
              // next();
            });
          });

          await next();
        } catch (err) {
          ctx.status = err.status || 500;
          ctx.body = err.message;
          ctx.app.emit('error', err, ctx);
        }
      });


      // router *must* be the last middleware added
      app.use(router.routes());
    }
  });
};
