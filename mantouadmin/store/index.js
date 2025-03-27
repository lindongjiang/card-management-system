import { createStore } from 'vuex';
import api from '../api';

export default createStore({
  state: {
    // 用户信息
    userInfo: uni.getStorageSync('userInfo') || null,
    token: uni.getStorageSync('token') || null,
    
    // 应用列表
    appList: [],
    
    // 卡密列表
    cardList: [],
    
    // 卡密统计信息
    cardStats: null,
    
    // 用户列表
    userList: [],
    
    // UDID绑定列表
    bindings: [],
    
    // 加载状态
    loading: false
  },
  
  mutations: {
    // 设置用户信息
    SET_USER_INFO(state, userInfo) {
      state.userInfo = userInfo;
      uni.setStorageSync('userInfo', userInfo);
    },
    
    // 设置令牌
    SET_TOKEN(state, token) {
      state.token = token;
      uni.setStorageSync('token', token);
    },
    
    // 清除用户信息
    CLEAR_USER_INFO(state) {
      state.userInfo = null;
      state.token = null;
      uni.removeStorageSync('userInfo');
      uni.removeStorageSync('token');
    },
    
    // 设置应用列表
    SET_APP_LIST(state, appList) {
      state.appList = appList;
    },
    
    // 设置卡密列表
    SET_CARD_LIST(state, cardList) {
      state.cardList = cardList;
    },
    
    // 设置卡密统计信息
    SET_CARD_STATS(state, stats) {
      state.cardStats = stats;
    },
    
    // 设置用户列表
    SET_USER_LIST(state, userList) {
      state.userList = userList;
    },
    
    // 设置UDID绑定列表
    SET_BINDINGS(state, bindings) {
      state.bindings = bindings;
    },
    
    // 设置加载状态
    SET_LOADING(state, status) {
      state.loading = status;
    }
  },
  
  actions: {
    // 登录
    async login({ commit }, { username, password }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.auth.login(username, password);
        if (result.success) {
          commit('SET_USER_INFO', result.user);
          commit('SET_TOKEN', result.token);
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 注销
    logout({ commit }) {
      commit('CLEAR_USER_INFO');
    },
    
    // 获取应用列表
    async fetchAppList({ commit }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.app.getAppList();
        if (result.success) {
          commit('SET_APP_LIST', result.data);
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 同步应用数据
    async syncApps({ commit, dispatch }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.app.syncApps();
        if (result.success) {
          await dispatch('fetchAppList');
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 更新应用卡密需求
    async updateKeyRequirement({ commit }, { appId, requiresKey }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.app.updateKeyRequirement(appId, requiresKey);
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 删除应用
    async deleteApp({ commit, dispatch }, appId) {
      try {
        commit('SET_LOADING', true);
        const result = await api.app.deleteApp(appId);
        if (result.success) {
          await dispatch('fetchAppList');
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 获取卡密列表
    async fetchCardList({ commit }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.card.getCardList();
        if (result.success) {
          commit('SET_CARD_LIST', result.data);
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 获取卡密统计
    async fetchCardStats({ commit }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.card.getCardStats();
        if (result.success) {
          commit('SET_CARD_STATS', result.data);
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 生成卡密
    async generateCards({ commit, dispatch }, params) {
      try {
        commit('SET_LOADING', true);
        const result = await api.card.generateCards(params);
        if (result.success) {
          await dispatch('fetchCardList');
          await dispatch('fetchCardStats');
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 删除卡密
    async deleteCard({ commit, dispatch }, cardId) {
      try {
        commit('SET_LOADING', true);
        const result = await api.card.deleteCard(cardId);
        if (result.success) {
          await dispatch('fetchCardList');
          await dispatch('fetchCardStats');
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 获取用户列表
    async fetchUserList({ commit }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.user.getUsers();
        if (result.success) {
          commit('SET_USER_LIST', result.data);
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 创建用户
    async createUser({ commit, dispatch }, userData) {
      try {
        commit('SET_LOADING', true);
        const result = await api.user.createUser(userData);
        if (result.success) {
          await dispatch('fetchUserList');
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 删除用户
    async deleteUser({ commit, dispatch }, userId) {
      try {
        commit('SET_LOADING', true);
        const result = await api.user.deleteUser(userId);
        if (result.success) {
          await dispatch('fetchUserList');
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 获取UDID绑定列表
    async fetchBindings({ commit }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.card.getAllBindings();
        if (result.success) {
          commit('SET_BINDINGS', result.data);
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 添加UDID绑定
    async addBinding({ commit, dispatch }, { udid, cardKey }) {
      try {
        commit('SET_LOADING', true);
        const result = await api.card.addBinding(udid, cardKey);
        if (result.success) {
          await dispatch('fetchBindings');
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    // 删除UDID绑定
    async deleteBinding({ commit, dispatch }, bindingId) {
      try {
        commit('SET_LOADING', true);
        const result = await api.card.deleteBinding(bindingId);
        if (result.success) {
          await dispatch('fetchBindings');
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    }
  },
  
  getters: {
    // 是否已登录
    isLoggedIn: state => !!state.token,
    
    // 是否为管理员
    isAdmin: state => state.userInfo?.role === 'admin',
    
    // 获取用户名
    username: state => state.userInfo?.username || '游客',
    
    // 获取可用卡密数量 - 修改为对应后端返回的字段
    availableCardCount: state => state.cardStats?.unused || 0,
    
    // 获取已使用卡密数量 - 修改为对应后端返回的字段
    usedCardCount: state => state.cardStats?.used || 0,
    
    // 获取总卡密数量 - 修改为对应后端返回的字段
    totalCardCount: state => state.cardStats?.total || 0
  }
}); 