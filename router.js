import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)


export function createRouter () {
  return new Router({
    mode: 'history',
    routes: [
      { path: '/', component: () => import('./src/pages/index.vue') },
      { path: '/about', component: () => import('./src/pages/about.vue') }
    ]
  })
}
