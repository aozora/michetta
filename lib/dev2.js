const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const chokidar = require('chokidar');
const Router = require('koa-router');
const convert = require('koa-connect');
const mount = require('koa-mount');
const serveStatic = require('koa-static');
const history = require('connect-history-api-fallback');
const portfinder = require('portfinder');
const prepare = require('./prepare');
const createServerConfig = require('./webpack/createServerConfig');
const { applyUserWebpackConfig } = require('./util');
const { createBundleRenderer } = require('vue-server-renderer');
const Koa = require('koa');
const router = require('koa-router')();

module.exports = async function dev(sourceDir, cliOptions = {}) {
  process.env.NODE_ENV = 'development';
  process.stdout.write('Extracting site metadata...');
  const options = await prepare(sourceDir);

  // find the web server port
  portfinder.basePort = cliOptions.port || options.siteConfig.port || 8080;
  const port = await portfinder.getPortPromise();

  // setup watchers to update options and dynamically generated files
  const update = () => {
    prepare(sourceDir).catch((err) => {
      console.error(chalk.red(err.stack));
    });
  };

  const app = new Koa();
  const serve = require('koa-static');
  // const favicon = require('koa-favicon');
  const router = require('koa-router')();

  let config = createServerConfig(options, cliOptions);
  config = config.toConfig();
  const userConfig = options.siteConfig.configureWebpack;
  if (userConfig) {
    config = applyUserWebpackConfig(userConfig, config, false /* isServer */);
  }

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

  // function createRenderer(bundle) {
  //   return createBundleRenderer(bundle, {
  //     cache: require('lru-cache')({
  //       max: 1000,
  //       maxAge: 1000 * 60 * 15
  //     })
  //   });
  // }

  // app.use(require('koa-bigpipe'));
  // app.use(favicon(path.resolve(__dirname, 'src/assets/logo.png')));
  // router.get('/dist', serve(resolve('./dist')));

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
          url: req.url === '/' ? '/index.html' : req.url,
          lang: 'en'
        };

        renderer.renderToString(context, (err, html) => {
          // handle error...
          if (err) {
            console.dir(err);
            console.error(chalk.red(`${err.status} - ${err.message}`));
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
      console.error(chalk.red(`${err.status} - ${err.message}`));
      ctx.status = err.status || 500;
      ctx.body = err.message;
      ctx.app.emit('error', err, ctx);
    }
  });

  // serve the static folder "public"
  const userPublic = path.resolve(sourceDir, '.vuepress/public');
  // respect base when serving static files...
  if (fs.existsSync(userPublic)) {
    app.use(mount(options.publicPath, serveStatic(userPublic)));
  }

  app
    .use(router.routes());
  // .use(router.allowedMethods());

  app.listen(port, () => {
    console.log(`\n  Michetta dev server listening at ${
      chalk.cyan(`http://localhost:${port}${options.publicPath}`)
    }\n`);
  });
};
