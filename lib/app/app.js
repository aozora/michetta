import Vue from 'vue';
import Router from 'vue-router';
import Meta from 'vue-meta';
import Page from '@pageTemplate'; // ./Page';
import dataMixin from './dataMixin';
import NotFound from '@notFound';
import { routes } from '@temp/routes';
import { siteData } from '@temp/siteData';
import enhanceApp from '@temp/enhanceApp';

// suggest dev server restart on base change
if (module.hot) {
  const prevBase = siteData.base;
  module.hot.accept('./.temp/siteData', () => {
    if (siteData.base !== prevBase) {
      window.alert('[vuepress] Site base has changed. ' +
        'Please restart dev server to ensure correct asset paths.');
    }
  });
}

Vue.config.productionTip = false;
Vue.use(Router);

// init Vue-Meta
Vue.use(Meta);

// mixin for exposing $site and $page
Vue.mixin(dataMixin);

// global helper for adding base path to absolute urls
Vue.prototype.$withBase = function (path) {
  const base = this.$site.base;
  if (path.charAt(0) === '/') {
    return base + path.slice(1);
  }
  return path;
};

// add 404 route
routes.push({
  path: '*',
  component: NotFound
});


// Merge App MetaInfo with config
const metaInfo = Object.assign({}, siteData.metaInfo, {
  titleTemplate: `%s - ${siteData.title}`,
  base: { target: '_blank', href: siteData.base },
  meta: [
    {
      name: 'description',
      content: siteData.description
    }
  ]
});


export function createApp() {
  const router = new Router({
    base: siteData.base,
    mode: 'history',
    fallback: false,
    routes,
    scrollBehavior: (to, from, saved) => {
      if (saved) {
        return saved;
      } else if (to.hash) {
        return { selector: to.hash };
      }
      return { x: 0, y: 0 };
    }
  });

  const options = {};

  enhanceApp({
    Vue, options, router, siteData
  });

  const app = new Vue(Object.assign(options, {
    router,
    metaInfo,
    render(h) {
      return h('body', {
        attrs: { id: 'app' }
      }, [
        // h('router-view', { ref: 'layout' })
        h(Page, { ref: 'layout' })
      ]);
    }
  }));

  return { app, router };
}
