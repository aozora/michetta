<p align="center">
  <img src="https://github.com/aozora/michetta/blob/master/logo.svg" alt="logo">
</p>

# michetta
Michetta is a simple static site generator based on [VuePress](https://vuepress.vuejs.org/): 
the goal is to generate pure HTML without any client-side framework, leveraging the component model of Vue.js Single File Components
 and SSR for server-side templating.

Michetta [miˈketta] (also known as rosetta [roˈzetta] "small rose") is an Italian white bread, recognizable from its bulged shape.

## Getting Started

You should install Michetta as a local dependency:
```
# install as a local dependency
npm install michetta --save
```

Then, add some scripts to `package.json`:

```
{
  "scripts": {
    "dev": "michetta dev src",
    "build": "michetta build src"
  }
}
```

You can now start writing with:
```
npm run dev
```

To generate static assets, run:
```
npm run build
```

By default the built files will be in .vuepress/dist, which can be configured via the dest field in .vuepress/config.js. 
The built files can be deployed to any static file server. See VuePress Deployment Guide for guides on deploying to popular services.



## Differences from vuePress

Michetta, at its core, it's a fork of VuePress but with some substantial changes:
* no theme is implemented.
* the working folder ".vuepress" has been made dynamic and available in the options as "root folder".
* the components folder has been moved from ".vuepress/components" to "src/components".
* support markdown files has been removed. Only Vue component can be used for pages and content.
* frontmatter data are not available; like NuxtJs, [Vue-Meta](https://github.com/declandewet/vue-meta) is used to generate head meta infos.

## Michetta Extended Options

Michetta extend the default configuration provided by VuePress, with the following options:

### sourceDir

* type: string
* default: `src`

Default folder that contains pages, layouts, components, etc. 

### sourcePages `TO BE REMOVED`

* type: string
* default: `pages`

Folder that contains the pages as Vue SFC. The path must be relative to the `sourceDir` path.

### layoutTemplate

* type: string
* default: `michetta/lib/app/default.html`

Folder that contains a custom template file for layout. The path must be relative to the `sourceDir` path.

### pageTemplate

* type: string
* default: `michetta/lib/app/Page.vue`

Default Vue component used for page layout; it must containes the `<router-view>` component.
Usually may be customized to include an Header and Footer components. 
The folder must be relative to the `sourceDir` path.

### notFound

* type: string
* default: `michetta/lib/app/NotFound.vue`

Default Vue component used for a custom 404 page. The path must be relative to the `sourceDir` path.
