const fs = require('fs')
const path = require('path')
// const Vue = require('vue')
const globby = require('globby');
const webpack = require('webpack')

// Create a renderer
// const renderer = require('vue-server-renderer').createRenderer()
// const renderer = require('vue-server-renderer').createRenderer({
//   template: fs.readFileSync('./src/layout/layout.html', 'utf-8')
// })
const context = require('./src/data/context')
const { createBundleRenderer } = require('vue-server-renderer')

const serverConfig = require('./webpack.server.config')
// watch and update server renderer
// const serverCompiler = webpack(serverConfig)
//
// const mfs = new MFS()
// serverCompiler.outputFileSystem = mfs
// serverCompiler.watch({}, (err, stats) => {
//   if (err) throw err
//   stats = stats.toJson()
//   if (stats.errors.length) return
//
//   // read bundle generated by vue-ssr-webpack-plugin
//   bundle = JSON.parse(readFile(mfs, 'vue-ssr-server-bundle.json'))
//   update()
// })


function getPages() {
  return globby.sync('src/pages/**/*.vue', {})
}


const pages = getPages();

pages.forEach((page) => {
  const fileName = path.basename(page)
  const fileNameNoExt = fileName.substr(0, fileName.indexOf('.vue'))
  console.log(`page: ${fileNameNoExt}`)

  webpack(serverConfig, function (err, stats) {
    if (err) {
      throw err
    }

    console.log('[webpack:build]', stats.toString({
      colors: true
    }));

    const renderer = createBundleRenderer(path.join(__dirname, '/dist/vue-ssr-server-bundle.json'), {
      runInNewContext: false, // recommended
      template: fs.readFileSync('./src/layout/layout.html', 'utf-8'), // (optional) page template
      // clientManifest // (optional) client build manifest
    })

    // Step 3: Render the Vue instance to HTML
    // in 2.5.0+, returns a Promise if no callback is passed:
    renderer.renderToString(context).then(html => {
      // page title will be "Hello"
      // with meta tags injected
      //console.log(html)

      fs.writeFileSync(path.resolve(`./dist/${fileNameNoExt}.html`), html, 'utf-8')

    }).catch(err => {
      console.error(err)
    })
  });


})


