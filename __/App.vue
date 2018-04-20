<template>
  <div class="app-container">
    <!--<top-nav v-if="!isLogin"></top-nav>-->
    <!--<main-menu v-if="!isLogin"></main-menu>-->

    <router-view></router-view>

    <!--<main-footer></main-footer>-->
  </div>
</template>

<script>
// import MainMenu from './components/MainMenu';
// import TopNav from './components/TopNav';
// import MainFooter from './components/MainFooter';

export default {
  name: 'app',

  components: {
    // TopNav,
    // MainMenu,
    // MainFooter
  }
};
</script>

<!--<style lang="scss">-->
<!--@import 'assets/scss/app.scss';-->
<!--</style>-->
