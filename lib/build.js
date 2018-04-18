const readline = require('readline')
const fs = require('fs-extra');
const path = require('path');
const resolve = file => path.resolve(__dirname, file);
const webpack = require('webpack');
const config = require('../michetta.config.js');
const prepare = require('./prepare');

// const contextData = require('./src/data/context')
const { createBundleRenderer } = require('vue-server-renderer');

const options = prepare(config.sourceDir);
const { outDir } = options;
fs.remove(outDir);

// let renderer;
// let readyPromise;
const templatePath = resolve('./src/layout/layout.html');
// const template = fs.readFileSync(templatePath, 'utf-8');
const serverBundle = path.join(__dirname, '../dist/vue-ssr-server-bundle.json');
const serverConfig = require('../webpack.server.config');

const renderer = createBundleRenderer(serverBundle, {
  // clientManifest,
  runInNewContext: false,
  inject: false,
  // template: await fs.readFile(templatePath, 'utf-8')
  template: fs.readFile(templatePath, 'utf-8')
});

function compile(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        return reject(err)
      }
      if (stats.hasErrors()) {
        stats.toJson().errors.forEach(err => {
          console.error(err)
        })
        reject(new Error(`Failed to compile with errors.`))
        return
      }
      resolve(stats.toJson({ modules: false }))
    })
  })
}

async function renderPage(page) {
  const pagePath = page.path;
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(`Rendering page: ${pagePath}`);

  // const pageMeta = renderPageMeta(page.frontmatter && page.frontmatter.meta)
  const context = {
    url: pagePath,
    // userHeadTags,
    // pageMeta,
    title: 'Michetta',
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


// compile!
const stats = compile(serverConfig);


// render pages
console.log('Rendering static HTML...');
for (const page of options.siteData.pages) {
  // await renderPage(page);
  renderPage(page);
}


//
// function render(req, res) {
//   const s = Date.now();
//
//   res.setHeader('Content-Type', 'text/html');
//   res.setHeader('Server', serverInfo);
//
//   const handleError = err => {
//     if (err.url) {
//       res.redirect(err.url);
//     } else if (err.code === 404) {
//       res.status(404).send('404 | Page Not Found');
//     } else {
//       // Render Error Page or Redirect
//       res.status(500).send('500 | Internal Server Error');
//       console.error(`error during render : ${req.url}`);
//       console.error(err.stack);
//     }
//   };
//
//   const context = {
//     title: 'Michetta Static Site Generator', // default title
//     url: req.url
//   };
//
//   renderer.renderToString(context, (err, html) => {
//     if (err) {
//       return handleError(err);
//     }
//
//     res.send(html);
//
//     if (!isProd) {
//       console.log(`whole request: ${Date.now() - s}ms`);
//     }
//   })
// }


//
// function getPages() {
//   return globby.sync('src/pages/**/*.vue', {})
// }
//
//
// const pages = getPages();
//
// pages.forEach((page) => {
//   const fileName = path.basename(page)
//   const fileNameNoExt = fileName.substr(0, fileName.indexOf('.vue'))
//   console.log(`page: ${fileNameNoExt}`)
//
//   // serverConfig.entry = page;
//
//   webpack(serverConfig, function (err, stats) {
//     if (err) {
//       throw err
//     }
//
//     console.log('[webpack:build]', stats.toString({
//       colors: true
//     }));
//
//     const renderer = createBundleRenderer(path.join(__dirname, '/dist/vue-ssr-server-bundle.json'), {
//       runInNewContext: false, // recommended
//       template: fs.readFileSync('./src/layout/layout.html', 'utf-8'), // (optional) page template
//       // clientManifest // (optional) client build manifest
//     })
//
//     // Step 3: Render the Vue instance to HTML
//     // in 2.5.0+, returns a Promise if no callback is passed:
//     renderer.renderToString(context).then(html => {
//       // write the html
//       fs.writeFileSync(path.resolve(`./dist/${fileNameNoExt}.html`), html, 'utf-8')
//     }).catch(err => {
//       console.error(err)
//     })
//   });
//
//
// })
//
//
