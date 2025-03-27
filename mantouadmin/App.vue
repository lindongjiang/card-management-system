<script>
	import config from './config'
	
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		},
		// Vue 3模式下的全局配置和方法
		setup() {
			// 为Vue 3提供全局属性
			uni.$config = config
			
			// 全局方法
			uni.$toast = (message, duration = 2000) => {
				uni.showToast({
					title: message,
					icon: 'none',
					duration
				})
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
