import Vue from 'vue';
import { siteData } from './.temp/siteData';

function prepare(siteData) {
  siteData.pages.forEach((page) => {
    if (!page.frontmatter) {
      page.frontmatter = {};
    }
  });
  if (siteData.locales) {
    Object.keys(siteData.locales).forEach((path) => {
      siteData.locales[path].path = path;
    });
  }
  Object.freeze(siteData);
}

prepare(siteData);
const store = new Vue({
  data: { siteData },
});

if (module.hot) {
  module.hot.accept('./.temp/siteData', () => {
    prepare(siteData);
    store.siteData = siteData;
  });
}

function getTitle(vm) {
  // components can simply provide a `title` option
  // which can be either a string or a function
  const { title } = vm.$options;
  if (title) {
    return typeof title === 'function'
      ? title.call(vm)
      : title;
  }

  return store.siteData.title;
}

export default {
  created() {
    const title = getTitle(this);
    if (title) {
      this.$ssrContext.title = title;
    }
  },
};
