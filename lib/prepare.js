/* eslint-disable no-use-before-define */
const fs = require('fs-extra');
const path = require('path');
const globby = require('globby');

const tempPath = path.resolve(__dirname, 'app/.temp');

fs.ensureDirSync(tempPath);

const tempCache = new Map();

/**
 * cache write to avoid hitting the dist if it didn't change
 * @param file
 * @param content
 * @returns {Promise<void>}
 */
async function writeTemp(file, content) {
  const cached = tempCache.get(file);
  if (cached !== content) {
    await fs.writeFile(path.join(tempPath, file), content);
    tempCache.set(file, content);
  }
}

const indexRE = /(?<=(^|\/))index\.vue$/i
const extRE = /\.vue$/;

function isIndexFile(file) {
  return indexRE.test(file);
}

/**
 * Get a url path from the file path
 *    index.vue -> /
 *    foo/index.vue -> /test/
 *    foo.vue -> /foo.html
 *    foo/bar.vue -> /foo/bar.html
 * @param file
 * @returns {string}
 */
function fileToPath(file) {
  if (isIndexFile(file)) {
    // index.vue -> /
    // foo/index.vue -> /foo/
    return `/${file.replace(indexRE, '')}`;
  }

  // foo.md -> /foo.html
  // foo/bar.md -> /foo/bar.html
  return `/${file.replace(extRE, '').replace(/\\/g, '/')}.html`;
}


/**
 * Resolve the options, merging defaults and users's
 * @param sourceDir
 * @returns {Promise<{siteConfig: {}, sourceDir: *, outDir: *, publicPath: (*|string), pageFiles: *, pagesData: null, notFoundPath: null}>}
 */
async function resolveOptions(sourceDir) {
  const vuepressDir = path.resolve(sourceDir, '.vuepress');
  const distDir = path.resolve(sourceDir, '.vuepress/dist');
  const configPath = path.resolve(vuepressDir, 'config.js');

  delete require.cache[configPath];
  const siteConfig = fs.existsSync(configPath) ? require(configPath) : {};
  const base = siteConfig.base || '/';

  const options = {
    siteConfig,
    sourceDir, // 'src'
    // sourcePages: path.resolve(sourceDir, 'pages'), // src/pages
    layoutTemplate: siteConfig.layoutTemplate ? path.resolve(sourceDir, siteConfig.layoutTemplate) : path.resolve(__dirname, './app/default.html'),
    pageTemplatePath: siteConfig.pageTemplate ? path.resolve(sourceDir, siteConfig.pageTemplate) : path.resolve(__dirname, './app/Page.vue'),
    // components: path.resolve(sourceDir, 'components'),
    outDir: siteConfig.dest
      ? path.resolve(siteConfig.dest)
      : distDir,
    publicPath: base,
    pageFiles: sort(await globby(['**/*.vue', '!.vuepress', '!node_modules'], { cwd: `${sourceDir}/pages` })),
    pagesData: null,
    notFoundPath: siteConfig.notFoundPath ? path.resolve(sourceDir, siteConfig.notFoundPath) : path.resolve(__dirname, './app/NotFound.vue')
  };


  // resolve pages
  const pagesData = await Promise.all(options.pageFiles.map(async (file) => {
    console.log(file);

    const data = {
      path: fileToPath(file),
      componentPath: path.resolve(`${options.sourceDir}/pages`, file),
      component: fileToComponentName(file)
    };

    return data;
  }));

  // resolve site data
  options.siteData = {
    title: siteConfig.title || '',
    description: siteConfig.description || '',
    base: siteConfig.base || '/',
    pages: pagesData,
    metaInfo: siteConfig.metaInfo || {}
  };

  console.dir(pagesData);

  return options;
}

/**
 * Dinamically generates the routes
 * @param pages
 * @param sourceDir
 * @param pageFiles
 * @returns {Promise<string>}
 */
async function genRoutesFile({ siteData: { pages }, sourceDir, pageFiles }) {
  // console.log('genRoutesFile: siteData.pages:');
  // console.dir(pages);
  //
  // console.log('genRoutesFile: pageFiles:');
  // console.dir(pageFiles);

  function genRoute({ path: pagePath }, index) {
    const file = pageFiles[index];
    const filePath = path.resolve(`${sourceDir}/pages`, file);
    let code = `
    {
      path: ${JSON.stringify(pagePath)},
      component: () => import(${JSON.stringify(filePath)}).then(comp => 
        Vue.component(${JSON.stringify(fileToComponentName(file))}, comp.default)
      )
    }`;

    if (/\/$/.test(pagePath)) {
      code += `,{
        path: ${JSON.stringify(`${pagePath}index.html`)},
        redirect: ${JSON.stringify(pagePath)}
      }`;
    }

    return code;
  }

  return (
    `export const routes = [${pages.map(genRoute).join(',')}\n]`
  );
}

/**
 * Get the Vue component name from file
 * @param file
 * @returns {string}
 */
function fileToComponentName(file) {
  let normalizedName = file
    .replace(/\/|\\/g, '-')
    .replace(extRE, '');
  if (isIndexFile(file)) {
    normalizedName = normalizedName.replace(/readme$/i, 'index');
  }
  const pagePrefix = /\.vue$/.test(file) ? 'page-' : '';
  return `${pagePrefix}${normalizedName}`;
}

async function genComponentRegistrationFile({ sourceDir }) {
  function genImport(file) {
    const name = fileToComponentName(file);
    const baseDir = path.resolve(sourceDir, 'components');
    const absolutePath = path.resolve(baseDir, file);
    const code = `Vue.component(${JSON.stringify(name)}, () => import(${JSON.stringify(absolutePath)}))`;
    return code;
  }

  const components = (await resolveComponents(sourceDir)) || [];
  return `import Vue from 'vue'\n${components.map(genImport).join('\n')}`;
}

function sort(arr) {
  return arr.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

async function resolveComponents(sourceDir) {
  const componentDir = path.resolve(sourceDir, 'components');
  if (!fs.existsSync(componentDir)) {
    return;
  }
  return sort(await globby(['**/*.vue'], { cwd: componentDir }));
}


module.exports = async function prepare(sourceDir) {
  // 1. load options
  const options = await resolveOptions(sourceDir);
  //
  // console.log('>>> OPTIONS:');
  // console.dir(options);

  // 2. generate routes & user components registration code
  const routesCode = await genRoutesFile(options);
  const componentCode = await genComponentRegistrationFile(options);

  await writeTemp('routes.js', [
    componentCode,
    routesCode
  ].join('\n\n'));

  // 3. generate siteData
  const dataCode = `export const siteData = ${JSON.stringify(options.siteData, null, 2)}`;
  await writeTemp('siteData.js', dataCode);

  // 4. generate basic polyfill if need to support older browsers
  let polyfillCode = '';
  if (!options.siteConfig.evergreen) {
    polyfillCode =
      `import 'es6-promise/auto'
if (!Object.assign) Object.assign = require('object-assign')`;
  }
  await writeTemp('polyfill.js', polyfillCode);

  // // 5. handle user override
  // if (options.useDefaultTheme) {
  //   const overridePath = path.resolve(sourceDir, '.vuepress/override.styl')
  //   const hasUserOverride = fs.existsSync(overridePath)
  //   await writeTemp(`override.styl`, hasUserOverride ? `@import(${JSON.stringify(overridePath)})` : ``)
  // }

  // 6. handle enhanceApp.js
  const enhancePath = path.resolve(sourceDir, '.vuepress/enhanceApp.js');
  const hasEnhancePath = fs.existsSync(enhancePath);
  await writeTemp(
    'enhanceApp.js',
    hasEnhancePath
      ? `export { default } from ${JSON.stringify(enhancePath)}`
      : 'export default function () {}',
  );

  return options;
};
