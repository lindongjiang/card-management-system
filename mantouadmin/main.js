import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
import store from './store'
import config from './config'

Vue.config.productionTip = false
App.mpType = 'app'

// 全局配置
Vue.prototype.$config = config

// 全局方法
Vue.prototype.$toast = (message, duration = 2000) => {
  uni.showToast({
    title: message,
    icon: 'none',
    duration
  })
}

const app = new Vue({
  ...App,
  store
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import store from './store'
import config from './config'

// 为uni全局对象添加方法和配置，以便在组件中使用
uni.$toast = (message, duration = 2000) => {
  uni.showToast({
    title: message,
    icon: 'none',
    duration
  })
}

uni.$config = config

// 创建Vue 3兼容性mixin，处理this.$toast和this.$config的调用
const compatibilityMixin = {
  methods: {
    $toast(message, duration = 2000) {
      uni.$toast(message, duration)
    }
  },
  computed: {
    $config() {
      return uni.$config
    }
  }
}

export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  
  // 全局混入兼容性处理
  app.mixin(compatibilityMixin)
  
  return {
    app
  }
}
// #endif