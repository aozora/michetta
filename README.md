<p align="center">
  <img src="https://github.com/aozora/michetta/blob/master/logo.svg" alt="logo">
</p>

# michetta
Michetta is a simple static site generator based on [VuePress](https://vuepress.vuejs.org/): 
the goal is to generate pure HTML without any Vue.js script, but leveraging the component model of Vue.js Single File Components
 and SSR for advanced templating.
Michetta [miˈketta] (also known as rosetta [roˈzetta] "small rose") is an Italian white bread, recognizable from its bulged shape.

## Differences from vuePress

Michetta, at its core, it's a fork of VuePress but with some substantial changes:
* the working folder ".vuepress" has been made dynamic and available in the options as "root folder".
* the components folder has been moved from ".vuepress/components" to "src/components"
* at the moment markdown files has been disabled, so no md file can be compiled as Vue component
* frontmatter data are not available; to extract head meta infos has been introduced Vue-Meta (used also in NuxtJs)

