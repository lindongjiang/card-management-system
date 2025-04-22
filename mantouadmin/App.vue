<script>
	import config from './config'
	
	export default {
		onLaunch: function() {
			console.log('App Launch')
			
			// 测试API连接
			setTimeout(() => {
				if (config.testApiConnection) {
					config.testApiConnection((workingUrl, success) => {
						if (success && workingUrl !== config.apiBaseUrl) {
							console.log('使用可用的API URL:', workingUrl);
							config.apiBaseUrl = workingUrl;
						}
						
						if (!success) {
							uni.showToast({
								title: 'API服务器连接失败，请检查网络',
								icon: 'none',
								duration: 3000
							});
						}
					});
				}
			}, 500);
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
			
			// 全局导航方法
			uni.$navigateTo = (url, options = {}) => {
				console.log('全局导航到:', url);
				uni.navigateTo({
					url,
					...options,
					fail: (err) => {
						console.error('导航失败:', err);
						if (options.fail) options.fail(err);
						
						// 尝试备用导航方式
						if (url.startsWith('/')) {
							setTimeout(() => {
								uni.navigateTo({
									url: url.replace(/^\//, ''),
									...options,
									fail: (err2) => {
										console.error('备用导航也失败:', err2);
										uni.showToast({
											title: '页面跳转失败',
											icon: 'none'
										});
									}
								});
							}, 100);
						}
					}
				});
			};
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
