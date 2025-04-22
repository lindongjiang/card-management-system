<template>
	<view class="container">
		<view class="header">
			<view class="back-button" @click="goBack">
				<text class="iconfont icon-back">←</text>
			</view>
			<text class="title">变身控制</text>
		</view>
		
		<view class="disguise-section">
			<view class="section-title">
				<text>应用外观伪装</text>
				<switch :checked="disguiseEnabled" @change="toggleDisguise" color="#409eff" />
			</view>
			
			<view class="disguise-options" :class="{'disabled': !disguiseEnabled}">
				<view class="option-item" v-for="(theme, index) in themeOptions" :key="index" 
					@click="selectTheme(theme)" 
					:class="{'selected': currentTheme.id === theme.id}">
					<view class="option-icon" :style="{backgroundColor: theme.color}">
						<text class="icon-text">{{theme.icon}}</text>
					</view>
					<view class="option-content">
						<text class="option-title">{{theme.name}}</text>
						<text class="option-desc">{{theme.description}}</text>
					</view>
					<view class="option-check" v-if="currentTheme.id === theme.id">
						<text class="iconfont icon-check">✓</text>
					</view>
				</view>
			</view>
			
			<view class="version-control" :class="{'disabled': !disguiseEnabled}">
				<view class="version-title">
					<text>最小变身版本</text>
					<text class="version-desc">仅对高于此版本的应用进行伪装</text>
				</view>
				<input class="version-input" type="text" v-model="minVersionDisguise" 
					placeholder="例如: 1.0.0" :disabled="!disguiseEnabled" @blur="validateMinVersion" />
				<view class="version-error" v-if="versionErrors.min">{{versionErrors.min}}</view>
			</view>
			
			<view class="version-control" :class="{'disabled': !disguiseEnabled}">
				<view class="version-title">
					<text>最大变身版本</text>
					<text class="version-desc">仅对低于此版本的应用进行伪装（可选）</text>
				</view>
				<input class="version-input" type="text" v-model="maxVersionDisguise" 
					placeholder="例如: 2.0.0" :disabled="!disguiseEnabled" @blur="validateMaxVersion" />
				<view class="version-error" v-if="versionErrors.max">{{versionErrors.max}}</view>
			</view>
			
			<view class="version-list-control" :class="{'disabled': !disguiseEnabled}">
				<view class="version-title">
					<text>版本黑名单</text>
					<text class="version-desc">这些特定版本将被禁止变身</text>
				</view>
				<view class="version-tags">
					<view class="version-tag" v-for="(version, index) in versionBlacklist" :key="index">
						{{version}}
						<text class="version-tag-close" @click="removeFromBlacklist(index)">×</text>
					</view>
					<view class="version-tag-add">
						<input class="version-tag-input" type="text" v-model="newBlacklistVersion" 
							placeholder="添加版本" @blur="addToBlacklist" />
					</view>
				</view>
				<view class="version-error" v-if="versionErrors.blacklist">{{versionErrors.blacklist}}</view>
			</view>
			
			<view class="version-list-control" :class="{'disabled': !disguiseEnabled}">
				<view class="version-title">
					<text>版本白名单</text>
					<text class="version-desc">仅允许这些特定版本变身（优先级高于其他规则）</text>
				</view>
				<view class="version-tags">
					<view class="version-tag" v-for="(version, index) in versionWhitelist" :key="index">
						{{version}}
						<text class="version-tag-close" @click="removeFromWhitelist(index)">×</text>
					</view>
					<view class="version-tag-add">
						<input class="version-tag-input" type="text" v-model="newWhitelistVersion" 
							placeholder="添加版本" @blur="addToWhitelist" />
					</view>
				</view>
				<view class="version-error" v-if="versionErrors.whitelist">{{versionErrors.whitelist}}</view>
			</view>
			
			<view class="version-history" v-if="versionHistory.length > 0">
				<view class="version-title">
					<text>最近变更历史</text>
				</view>
				<view class="history-list">
					<view class="history-item" v-for="(item, index) in versionHistory" :key="index">
						<text class="history-date">{{formatDate(item.changed_at)}}</text>
						<text class="history-detail">从 {{item.old_value || '无'}} 变更为 {{item.new_value}}</text>
					</view>
				</view>
			</view>
		</view>
		
		<view class="disguise-section">
			<view class="section-title">
				<text>应用名称伪装</text>
				<switch :checked="nameDisguiseEnabled" @change="toggleNameDisguise" color="#409eff" />
			</view>
			
			<view class="name-disguise" :class="{'disabled': !nameDisguiseEnabled}">
				<input class="name-input" type="text" v-model="disguiseName" placeholder="输入伪装应用名称" 
					:disabled="!nameDisguiseEnabled" @blur="saveName" />
			</view>
		</view>
		
		<view class="disguise-section">
			<view class="section-title">
				<text>应用图标伪装</text>
				<switch :checked="iconDisguiseEnabled" @change="toggleIconDisguise" color="#409eff" />
			</view>
			
			<view class="icon-disguise" :class="{'disabled': !iconDisguiseEnabled}">
				<scroll-view scroll-x="true" class="icon-scroll">
					<view class="icon-list">
						<view class="icon-item" v-for="(icon, index) in iconOptions" :key="index" 
							@click="selectIcon(icon)" 
							:class="{'selected': currentIcon.id === icon.id}">
							<image class="app-icon" :src="icon.url" mode="aspectFit"></image>
							<text class="icon-name">{{icon.name}}</text>
							<view class="icon-check" v-if="currentIcon.id === icon.id">
								<text class="iconfont icon-check">✓</text>
							</view>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
		
		<view class="disguise-section">
			<view class="section-title">
				<text>预览</text>
			</view>
			
			<view class="preview-container">
				<view class="phone-frame">
					<view class="phone-screen">
						<view class="app-preview" :style="{backgroundColor: currentTheme.color}">
							<image class="preview-icon" :src="iconDisguiseEnabled ? currentIcon.url : '/static/logo.png'" mode="aspectFit"></image>
							<text class="preview-name">{{nameDisguiseEnabled ? disguiseName : '馒头客户端'}}</text>
						</view>
					</view>
				</view>
			</view>
		</view>
		
		<button class="apply-button" @click="applyChanges" :disabled="!hasChanges">应用变更</button>
	</view>
</template>

<script>
import config from '../../config/index.js';

export default {
	data() {
		return {
			disguiseEnabled: false,
			nameDisguiseEnabled: false,
			iconDisguiseEnabled: false,
			disguiseName: '日历',
			minVersionDisguise: '1.0.0',
			maxVersionDisguise: '',
			versionBlacklist: [],
			versionWhitelist: [],
			versionHistory: [],
			newBlacklistVersion: '',
			newWhitelistVersion: '',
			originalSettings: null,
			hasChanges: false,
			versionErrors: {
				min: '',
				max: '',
				blacklist: '',
				whitelist: ''
			},
			
			themeOptions: [
				{ 
					id: 'calendar', 
					name: '日历', 
					description: '伪装成日历应用', 
					color: '#ff9500', 
					icon: '📅' 
				},
				{ 
					id: 'notes', 
					name: '备忘录', 
					description: '伪装成笔记应用', 
					color: '#ffcc00', 
					icon: '📝' 
				},
				{ 
					id: 'calculator', 
					name: '计算器', 
					description: '伪装成计算器应用', 
					color: '#34c759', 
					icon: '🧮' 
				},
				{ 
					id: 'weather', 
					name: '天气', 
					description: '伪装成天气应用', 
					color: '#007aff', 
					icon: '🌤️' 
				},
				{ 
					id: 'clock', 
					name: '时钟', 
					description: '伪装成时钟应用', 
					color: '#5856d6', 
					icon: '⏰' 
				}
			],
			currentTheme: { id: 'calendar', name: '日历', description: '伪装成日历应用', color: '#ff9500', icon: '📅' },
			
			iconOptions: [
				{ id: 'calendar', name: '日历', url: '/static/disguise/calendar.png' },
				{ id: 'notes', name: '备忘录', url: '/static/disguise/notes.png' },
				{ id: 'calculator', name: '计算器', url: '/static/disguise/calculator.png' },
				{ id: 'weather', name: '天气', url: '/static/disguise/weather.png' },
				{ id: 'clock', name: '时钟', url: '/static/disguise/clock.png' }
			],
			currentIcon: { id: 'calendar', name: '日历', url: '/static/disguise/calendar.png' }
		}
	},
	onLoad() {
		// 加载已保存的设置
		this.loadSettings();
		// 加载服务器变身设置
		this.loadServerSettings();
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},
		loadSettings() {
			try {
				const settings = uni.getStorageSync('disguiseSettings');
				if (settings) {
					const disguiseSettings = JSON.parse(settings);
					
					this.disguiseEnabled = disguiseSettings.enabled || false;
					this.nameDisguiseEnabled = disguiseSettings.nameEnabled || false;
					this.iconDisguiseEnabled = disguiseSettings.iconEnabled || false;
					
					if (disguiseSettings.name) {
						this.disguiseName = disguiseSettings.name;
					}
					
					if (disguiseSettings.theme) {
						const theme = this.themeOptions.find(t => t.id === disguiseSettings.theme.id);
						if (theme) {
							this.currentTheme = theme;
						}
					}
					
					if (disguiseSettings.icon) {
						const icon = this.iconOptions.find(i => i.id === disguiseSettings.icon.id);
						if (icon) {
							this.currentIcon = icon;
						}
					}
					
					// 加载版本控制设置
					if (disguiseSettings.minVersionDisguise) {
						this.minVersionDisguise = disguiseSettings.minVersionDisguise;
					}
					
					if (disguiseSettings.maxVersionDisguise) {
						this.maxVersionDisguise = disguiseSettings.maxVersionDisguise;
					}
					
					if (Array.isArray(disguiseSettings.versionBlacklist)) {
						this.versionBlacklist = disguiseSettings.versionBlacklist;
					}
					
					if (Array.isArray(disguiseSettings.versionWhitelist)) {
						this.versionWhitelist = disguiseSettings.versionWhitelist;
					}
					
					// 保存原始设置用于检测变更
					this.originalSettings = JSON.stringify(disguiseSettings);
				}
			} catch (e) {
				console.error('加载伪装设置出错:', e);
			}
		},
		toggleDisguise(e) {
			this.disguiseEnabled = e.detail.value;
			this.checkChanges();
		},
		toggleNameDisguise(e) {
			this.nameDisguiseEnabled = e.detail.value;
			this.checkChanges();
		},
		toggleIconDisguise(e) {
			this.iconDisguiseEnabled = e.detail.value;
			this.checkChanges();
		},
		selectTheme(theme) {
			if (!this.disguiseEnabled) return;
			
			this.currentTheme = theme;
			// 同步更新图标（如果可能）
			const matchingIcon = this.iconOptions.find(i => i.id === theme.id);
			if (matchingIcon) {
				this.currentIcon = matchingIcon;
			}
			// 同步更新名称（如果可能）
			this.disguiseName = theme.name;
			
			this.checkChanges();
		},
		selectIcon(icon) {
			if (!this.iconDisguiseEnabled) return;
			
			this.currentIcon = icon;
			this.checkChanges();
		},
		saveName() {
			this.checkChanges();
		},
		checkChanges() {
			const currentSettings = this.getCurrentSettings();
			// 将当前设置与原始设置比较
			this.hasChanges = this.originalSettings !== JSON.stringify(currentSettings);
		},
		getCurrentSettings() {
			return {
				enabled: this.disguiseEnabled,
				nameEnabled: this.nameDisguiseEnabled,
				iconEnabled: this.iconDisguiseEnabled,
				name: this.disguiseName,
				theme: this.currentTheme,
				icon: this.currentIcon,
				minVersionDisguise: this.minVersionDisguise,
				maxVersionDisguise: this.maxVersionDisguise,
				versionBlacklist: this.versionBlacklist,
				versionWhitelist: this.versionWhitelist
			};
		},
		applyChanges() {
			if (!this.hasChanges) return;
			
			// 验证所有版本格式
			if (!this.validateMinVersion() || 
				!this.validateMaxVersion()) {
				uni.showToast({
					title: '请修正版本格式错误',
					icon: 'none'
				});
				return;
			}
			
			const settings = this.getCurrentSettings();
			
			try {
				// 保存设置到本地存储
				uni.setStorageSync('disguiseSettings', JSON.stringify(settings));
				
				// 更新服务器端设置(如果有管理权限)
				this.updateServerSettings(settings);
				
				// 触发应用级别的样式变更
				if (uni.$updateAppDisguise) {
					uni.$updateAppDisguise(settings);
				}
				
				// 设置成功
				uni.showToast({
					title: '设置已保存',
					icon: 'success'
				});
				
				// 更新原始设置用于检测变更
				this.originalSettings = JSON.stringify(settings);
				this.hasChanges = false;
				
				// 记录应用变更事件
				console.log('应用伪装设置已更新:', settings);
				
				// 如果平台支持，更新应用图标和名称
				this.updateNativeAppearance(settings);
				
			} catch (e) {
				console.error('保存设置失败:', e);
				uni.showToast({
					title: '保存设置失败',
					icon: 'none'
				});
			}
		},
		updateServerSettings(settings) {
			// 如果有管理员权限，更新服务器端设置
			const token = uni.getStorageSync('token');
			if (!token) return;
			
			const apiUrl = config.apiBaseUrl;
			uni.request({
				url: `${apiUrl}/api/settings/disguise`,
				method: 'PUT',
				header: {
					'Authorization': token,
					'Content-Type': 'application/json'
				},
				data: {
					disguise_enabled: settings.enabled,
					min_version_disguise: settings.minVersionDisguise,
					max_version_disguise: settings.maxVersionDisguise,
					version_blacklist: settings.versionBlacklist,
					version_whitelist: settings.versionWhitelist
				},
				success: (res) => {
					if (res.data && res.data.success) {
						console.log('服务器变身设置更新成功');
						// 刷新版本历史
						this.loadServerSettings();
					} else {
						console.error('服务器变身设置更新失败:', res.data);
						if (res.data && res.data.message) {
							uni.showToast({
								title: res.data.message,
								icon: 'none'
							});
						}
					}
				},
				fail: (err) => {
					console.error('服务器变身设置更新请求失败:', err);
				}
			});
		},
		updateNativeAppearance(settings) {
			// 检查平台
			// #ifdef APP-PLUS
			try {
				if (settings.nameEnabled && settings.name) {
					// 更新应用名称（仅支持App）
					plus.runtime.appid && plus.runtime.rename(settings.name);
				}
				
				if (settings.iconEnabled && settings.icon) {
					// 更新应用图标（仅支持App）
					// 注意：此功能需要原生插件支持
					const iconPath = settings.icon.url.replace(/^\/static/, '_www');
					if (plus.runtime.appid && plus.runtime.icon) {
						plus.runtime.icon = iconPath;
					}
				}
			} catch (e) {
				console.error('更新原生应用外观失败:', e);
			}
			// #endif
		},
		loadServerSettings() {
			// 尝试从服务器加载变身设置
			const apiUrl = config.apiBaseUrl;
			uni.request({
				url: `${apiUrl}/api/settings/disguise`,
				method: 'GET',
				header: {
					'Authorization': uni.getStorageSync('token') || ''
				},
				success: (res) => {
					if (res.data && res.data.success && res.data.data) {
						const serverSettings = res.data.data;
						if (serverSettings.min_version_disguise) {
							this.minVersionDisguise = serverSettings.min_version_disguise;
						}
						
						if (serverSettings.max_version_disguise) {
							this.maxVersionDisguise = serverSettings.max_version_disguise;
						}
						
						if (Array.isArray(serverSettings.version_blacklist)) {
							this.versionBlacklist = serverSettings.version_blacklist;
						}
						
						if (Array.isArray(serverSettings.version_whitelist)) {
							this.versionWhitelist = serverSettings.version_whitelist;
						}
						
						if (Array.isArray(serverSettings.version_history)) {
							this.versionHistory = serverSettings.version_history;
						}
						
						console.log('已从服务器加载变身设置');
						
						// 更新检测变更的基准
						this.originalSettings = JSON.stringify(this.getCurrentSettings());
					}
				},
				fail: (err) => {
					console.error('加载服务器变身设置失败:', err);
				}
			});
		},
		validateVersionFormat(version) {
			if (!version) return true; // 空值是有效的（对于可选字段）
			const versionRegex = /^\d+\.\d+\.\d+$/;
			return versionRegex.test(version);
		},
		
		validateMinVersion() {
			this.versionErrors.min = '';
			if (this.minVersionDisguise && !this.validateVersionFormat(this.minVersionDisguise)) {
				this.versionErrors.min = '请使用有效的版本格式，例如：1.0.0';
				return false;
			}
			this.checkChanges();
			return true;
		},
		
		validateMaxVersion() {
			this.versionErrors.max = '';
			if (this.maxVersionDisguise && !this.validateVersionFormat(this.maxVersionDisguise)) {
				this.versionErrors.max = '请使用有效的版本格式，例如：2.0.0';
				return false;
			}
			
			// 检查最大版本是否大于最小版本
			if (this.minVersionDisguise && this.maxVersionDisguise) {
				const v1Parts = this.minVersionDisguise.split('.').map(Number);
				const v2Parts = this.maxVersionDisguise.split('.').map(Number);
				
				// 简单的版本比较
				for (let i = 0; i < 3; i++) {
					if ((v1Parts[i] || 0) > (v2Parts[i] || 0)) {
						this.versionErrors.max = '最大版本必须大于最小版本';
						return false;
					} else if ((v1Parts[i] || 0) < (v2Parts[i] || 0)) {
						break;
					}
				}
			}
			
			this.checkChanges();
			return true;
		},
		
		addToBlacklist() {
			if (!this.newBlacklistVersion) return;
			
			this.versionErrors.blacklist = '';
			if (!this.validateVersionFormat(this.newBlacklistVersion)) {
				this.versionErrors.blacklist = '请使用有效的版本格式，例如：1.0.0';
				return;
			}
			
			if (!this.versionBlacklist.includes(this.newBlacklistVersion)) {
				this.versionBlacklist.push(this.newBlacklistVersion);
				this.newBlacklistVersion = '';
				this.checkChanges();
			}
		},
		
		removeFromBlacklist(index) {
			this.versionBlacklist.splice(index, 1);
			this.checkChanges();
		},
		
		addToWhitelist() {
			if (!this.newWhitelistVersion) return;
			
			this.versionErrors.whitelist = '';
			if (!this.validateVersionFormat(this.newWhitelistVersion)) {
				this.versionErrors.whitelist = '请使用有效的版本格式，例如：1.0.0';
				return;
			}
			
			if (!this.versionWhitelist.includes(this.newWhitelistVersion)) {
				this.versionWhitelist.push(this.newWhitelistVersion);
				this.newWhitelistVersion = '';
				this.checkChanges();
			}
		},
		
		removeFromWhitelist(index) {
			this.versionWhitelist.splice(index, 1);
			this.checkChanges();
		},
		
		formatDate(dateString) {
			if (!dateString) return '';
			const date = new Date(dateString);
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
		}
	}
}
</script>

<style lang="scss">
.container {
	padding: 20px;
	background-color: #f8f8f8;
	min-height: 100vh;
}

.header {
	display: flex;
	align-items: center;
	margin-bottom: 30px;
	
	.back-button {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		
		.iconfont {
			font-size: 20px;
		}
	}
	
	.title {
		font-size: 20px;
		font-weight: bold;
		flex: 1;
	}
}

.disguise-section {
	background-color: #ffffff;
	border-radius: 12px;
	padding: 15px;
	margin-bottom: 20px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	
	.section-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
		
		text {
			font-size: 16px;
			font-weight: 500;
		}
	}
}

.disguise-options {
	&.disabled {
		opacity: 0.6;
	}
	
	.option-item {
		display: flex;
		align-items: center;
		padding: 12px;
		border-radius: 8px;
		margin-bottom: 10px;
		background-color: #f9f9f9;
		
		&.selected {
			background-color: #e6f7ff;
			border: 1px solid #409eff;
		}
		
		.option-icon {
			width: 40px;
			height: 40px;
			border-radius: 8px;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-right: 12px;
			
			.icon-text {
				font-size: 20px;
			}
		}
		
		.option-content {
			flex: 1;
			
			.option-title {
				font-size: 16px;
				margin-bottom: 4px;
			}
			
			.option-desc {
				font-size: 12px;
				color: #999;
			}
		}
		
		.option-check {
			color: #409eff;
			font-size: 18px;
		}
	}
}

.name-disguise {
	&.disabled {
		opacity: 0.6;
	}
	
	.name-input {
		background-color: #f9f9f9;
		border-radius: 8px;
		padding: 12px;
		font-size: 16px;
		border: 1px solid #eee;
	}
}

.icon-disguise {
	&.disabled {
		opacity: 0.6;
	}
	
	.icon-scroll {
		width: 100%;
		white-space: nowrap;
	}
	
	.icon-list {
		display: flex;
		padding: 5px 0;
	}
	
	.icon-item {
		display: inline-block;
		width: 80px;
		padding: 10px;
		text-align: center;
		position: relative;
		
		&.selected {
			background-color: #e6f7ff;
			border-radius: 8px;
		}
		
		.app-icon {
			width: 60px;
			height: 60px;
			border-radius: 12px;
		}
		
		.icon-name {
			font-size: 12px;
			margin-top: 5px;
			display: block;
		}
		
		.icon-check {
			position: absolute;
			right: 5px;
			top: 5px;
			color: #409eff;
			font-size: 16px;
			background-color: #fff;
			border-radius: 50%;
			width: 20px;
			height: 20px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}
}

.preview-container {
	display: flex;
	justify-content: center;
	padding: 15px 0;
	
	.phone-frame {
		width: 200px;
		height: 400px;
		background-color: #333;
		border-radius: 30px;
		padding: 15px;
		border: 1px solid #000;
	}
	
	.phone-screen {
		background-color: #fff;
		width: 100%;
		height: 100%;
		border-radius: 20px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	
	.app-preview {
		margin: 15px;
		border-radius: 15px;
		width: 70px;
		height: 70px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		
		.preview-icon {
			width: 40px;
			height: 40px;
		}
		
		.preview-name {
			font-size: 12px;
			color: #fff;
			margin-top: 5px;
			text-shadow: 0 1px 2px rgba(0,0,0,0.5);
		}
	}
}

.apply-button {
	background-color: #409eff;
	color: #fff;
	font-size: 16px;
	padding: 12px;
	border-radius: 10px;
	text-align: center;
	width: 100%;
	margin-top: 20px;
	
	&:disabled {
		background-color: #cccccc;
		color: #999;
	}
}

.version-control {
	margin-top: 15px;
	padding-top: 15px;
	border-top: 1px solid #eee;
	
	&.disabled {
		opacity: 0.6;
	}
	
	.version-title {
		margin-bottom: 10px;
		
		text {
			font-size: 16px;
			font-weight: 500;
			display: block;
		}
		
		.version-desc {
			font-size: 12px;
			color: #999;
			font-weight: normal;
			margin-top: 4px;
		}
	}
	
	.version-input {
		background-color: #f9f9f9;
		border-radius: 8px;
		padding: 12px;
		font-size: 16px;
		border: 1px solid #eee;
		width: 100%;
	}
}

.version-error {
	color: #ff4d4f;
	font-size: 12px;
	margin-top: 4px;
}

.version-tags {
	display: flex;
	flex-wrap: wrap;
	margin-top: 10px;
	gap: 8px;
}

.version-tag {
	background-color: #e6f7ff;
	border: 1px solid #91d5ff;
	border-radius: 4px;
	padding: 4px 8px;
	font-size: 12px;
	display: flex;
	align-items: center;
}

.version-tag-close {
	margin-left: 4px;
	font-size: 16px;
	width: 16px;
	height: 16px;
	line-height: 14px;
	text-align: center;
	color: #999;
}

.version-tag-add {
	border: 1px dashed #d9d9d9;
	border-radius: 4px;
	padding: 4px 8px;
}

.version-tag-input {
	width: 80px;
	font-size: 12px;
	height: 18px;
	padding: 0;
	background: transparent;
}

.version-list-control {
	margin-top: 15px;
	
	&.disabled {
		opacity: 0.6;
	}
}

.version-history {
	margin-top: 15px;
	border-top: 1px solid #eee;
	padding-top: 15px;
}

.history-list {
	margin-top: 10px;
}

.history-item {
	font-size: 12px;
	margin-bottom: 8px;
	display: flex;
	flex-direction: column;
}

.history-date {
	color: #999;
	margin-bottom: 2px;
}

.history-detail {
	color: #333;
}
</style> 