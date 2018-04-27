<p align="center">
  <img src="https://github.com/aozora/michetta/blob/master/logo.svg" alt="logo">
</p>

# michetta
Michetta is a simple static site generator based on [VuePress](https://vuepress.vuejs.org/): 
the goal is to generate pure HTML without any client-side framework, leveraging the component model of Vue.js Single File Components
 and SSR for server-side templating.

Michetta [miˈketta] (also known as rosetta [roˈzetta] "small rose") is an Italian white bread, recognizable from its bulged shape.

## Usage
[TBC]

## Differences from vuePress

Michetta, at its core, it's a fork of VuePress but with some substantial changes:
* no theme is implemented.
* the working folder ".vuepress" has been made dynamic and available in the options as "root folder".
* the components folder has been moved from ".vuepress/components" to "src/components"
* at the moment markdown files has been disabled, so no md file can be compiled as Vue component
* frontmatter data are not available; to extract head meta infos has been introduced Vue-Meta (used also in NuxtJs)

## Michetta Extended Options

To the default options provided by VuePress, the following are specific for Michetta:

### sourceDir

* type: string
* default: `src`

Default folder that contains pages, layouts, components, etc. 

### sourcePages

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
