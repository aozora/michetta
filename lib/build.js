/* eslint-disable no-use-before-define */
module.exports = async function build(sourceDir, cliOptions = {}) {
  process.env.NODE_ENV = 'production';

  const fs = require('fs-extra');
  const path = require('path');
  const chalk = require('chalk');
  const readline = require('readline');
  const webpack = require('webpack');
  const prepare = require('./prepare');
  const createServerConfig = require('./webpack/createServerConfig');
  const { createBundleRenderer } = require('vue-server-renderer');
  const { normalizeHeadTag, applyUserWebpackConfig } = require('./util');

  process.stdout.write('Extracting site metadata...');
  const options = await prepare(sourceDir);
  if (cliOptions.outDir) {
    options.outDir = cliOptions.outDir;
  }


  const { outDir } = options;
  await fs.remove(outDir);

  let serverConfig = createServerConfig(options, cliOptions).toConfig();


  // apply user config...
  const userConfig = options.siteConfig.configureWebpack;
  if (userConfig) {
    // clientConfig = applyUserWebpackConfig(userConfig, clientConfig, false);
    serverConfig = applyUserWebpackConfig(userConfig, serverConfig, true);
  }

  // compile!
  // console.dir(serverConfig);
  const stats = await compile([serverConfig]);

  const serverBundle = require(path.resolve(outDir, 'manifest/server.json'));
  // remove manifests after loading them.
  await fs.remove(path.resolve(outDir, 'manifest'));

  // find and remove empty style chunk caused by
  // https://github.com/webpack-contrib/mini-css-extract-plugin/issues/85
  // TODO remove when it's fixed
  await workaroundEmptyStyleChunk();

  // create server renderer using built manifests
  const renderer = createBundleRenderer(serverBundle, {
    // clientManifest,
    runInNewContext: false,
    inject: false,
    // template: await fs.readFile(path.resolve(__dirname, 'app/index.ssr.html'), 'utf-8'),
    template: await fs.readFile(options.layoutTemplate, 'utf-8')
  });


  // render pages
  console.log('Rendering static HTML...');
  for (const page of options.siteData.pages) {
    await renderPage(page);
  }

  // if the user does not have a custom 404.md, generate the theme's default
  if (!options.siteData.pages.some(p => p.path === '/404.html')) {
    await renderPage({ path: '/404.html' });
  }

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);

  // DONE.
  const relativeDir = path.relative(process.cwd(), outDir);
  console.log(`\n${chalk.green('Success!')} Generated static files in ${chalk.cyan(relativeDir)}.`);


  // ------------------- Helpers -------------------

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

  /**
   * Render a page
   * @param page
   * @returns {Promise<void>}
   */
  async function renderPage(page) {
    const pagePath = page.path;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`Rendering page: ${pagePath}`);

    const context = {
      url: pagePath,
      // title: 'Michetta',
      lang: 'en'
    };

    let html;
    try {
      html = await renderer.renderToString(context);
    } catch (e) {
      console.error(chalk.red(`Error rendering ${pagePath}:`));
      throw e;
    }
    const filename = pagePath.replace(/\/$/, '/index.html').replace(/^\//, '');
    const filePath = path.resolve(outDir, filename);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, html);
  }

  /**
   * Workaround
   * @returns {Promise<void>}
   */
  async function workaroundEmptyStyleChunk() {
    const styleChunk = stats.children[0].assets.find(a => /styles\.\w{8}\.js$/.test(a.name));
    if (!styleChunk) return;
    const styleChunkPath = path.resolve(outDir, styleChunk.name);
    const styleChunkContent = await fs.readFile(styleChunkPath, 'utf-8');
    await fs.remove(styleChunkPath);
    // prepend it to app.js.
    // this is necessary for the webpack runtime to work properly.
    const appChunk = stats.children[0].assets.find(a => /app\.\w{8}\.js$/.test(a.name));
    const appChunkPath = path.resolve(outDir, appChunk.name);
    const appChunkContent = await fs.readFile(appChunkPath, 'utf-8');
    await fs.writeFile(appChunkPath, styleChunkContent + appChunkContent);
  }
};
