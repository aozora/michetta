import { createApp } from './app';

export default context => new Promise((resolve, reject) => {
  const { app, router } = createApp();
  const { url } = context;
  const { fullPath } = router.resolve(url).route;

  const meta = app.$meta();
  // eslint-disable-next-line no-param-reassign
  context.meta = meta;

  if (fullPath !== url) {
    return reject({ url: fullPath });
  }

  router.push(url);
  router.onReady(() => resolve(app));
});
