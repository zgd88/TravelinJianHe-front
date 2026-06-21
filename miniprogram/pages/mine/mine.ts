import { BASE_URL , request } from '../../utils/api';
// pages/mine/mine.ts
Page({
  data: {
    avatarUrl: '',
    nickname: '用户',
    phone: '',
    maskedPhone: '',
    role: '',
    roleText: '',
    totalOrders: 0,
    totalAmount: '0',
    completedOrders: 0,
    // 昵称编辑弹窗
    showNicknameModal: false,
    editingNickname: '',
    // 菜单
    menus: [
      { icon: '💰', text: '我的钱包', key: 'wallet' },
      { icon: '🎫', text: '优惠券', key: 'coupon' },
      { icon: '⚙️', text: '设置', key: 'settings' },
      { icon: '🆘', text: '帮助与反馈', key: 'help' },
    ] as any[],
    // 司机认证
    verifyStatus: '',
    verifyStatusText: '',
  },

  onShow() {
    if (typeof this.getTabBar === 'function') this.getTabBar().setData({ selected: 1 });
    this.loadUserInfo();
    this.loadStats();
  },

  // ========== 下拉刷新 ==========
  onPullDownRefresh() {
    this.loadStats().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ========== 用户信息 ==========
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const role = wx.getStorageSync('role') || 'passenger';
    const phone = userInfo.phone || '';
    this.setData({
      avatarUrl: userInfo.avatarUrl || '',
      nickname: userInfo.nickname || '用户',
      phone: phone,
      maskedPhone: phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
      role: role,
      roleText: role === 'driver' ? '司机' : '乘客',
    });

    if (role === 'driver') {
      this.checkVerifyStatus();
    }
  },

  // 选择头像
  getUserAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({ avatarUrl: tempFilePath });
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.avatarUrl = tempFilePath;
        wx.setStorageSync('userInfo', userInfo);

        // 同步到后端
        const token = wx.getStorageSync('token');
        if (token) {
          request({
            url: BASE_URL + '/api/auth/profile',
            method: 'PUT',
            data: { avatar: tempFilePath },
            header: {
              'Authorization': 'Bearer ' + token
            }
          });
        }
        wx.showToast({ title: '头像已更新', icon: 'success' });
      }
    });
  },

  // ========== 昵称编辑 ==========
  openNicknameModal() {
    this.setData({
      showNicknameModal: true,
      editingNickname: this.data.nickname
    });
  },
  closeNicknameModal() {
    this.setData({ showNicknameModal: false });
  },
  onNicknameInput(e: any) {
    this.setData({ editingNickname: e.detail.value });
  },
  saveNickname() {
    const name = this.data.editingNickname.trim();
    if (!name) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (name.length > 20) {
      wx.showToast({ title: '昵称不超过20个字符', icon: 'none' });
      return;
    }

    const token = wx.getStorageSync('token');
    request({
      url: BASE_URL + '/api/auth/profile',
      method: 'PUT',
      data: { nickname: name },
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.nickname = name;
        wx.setStorageSync('userInfo', userInfo);
        this.setData({ nickname: name, showNicknameModal: false });
        wx.showToast({ title: '昵称已更新', icon: 'success' });
      }
    }).catch(() => {
      // 离线模式：仅本地更新
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickname = name;
      wx.setStorageSync('userInfo', userInfo);
      this.setData({ nickname: name, showNicknameModal: false });
      wx.showToast({ title: '昵称已更新', icon: 'success' });
    });
  },

  // ========== 角色切换 ==========
  switchRole() {
    const currentRole = wx.getStorageSync('role') || 'passenger';
    const newRole = currentRole === 'driver' ? 'passenger' : 'driver';
    wx.setStorageSync('role', newRole);

    wx.showToast({ title: '已切换为' + (newRole === 'driver' ? '司机' : '乘客'), icon: 'success' });

    setTimeout(() => {
      if (newRole === 'driver') {
        wx.switchTab({ url: '/pages/driver-home/driver-home' });
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }, 800);
  },

  // ========== 统计数据 ==========
  loadStats(): Promise<void> {
    const token = wx.getStorageSync('token');
    if (!token) return Promise.resolve();

    return request({
      url: BASE_URL + '/api/order/stats',
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        const { passenger, driver } = res.data.data;
        const role = wx.getStorageSync('role') || 'passenger';
        const stats = role === 'driver' ? driver : passenger;
        this.setData({
          totalOrders: stats.total || 0,
          totalAmount: Number(stats.amount || 0).toFixed(2),
          completedOrders: stats.completed || 0,
        });
      }
    }).catch(() => {});
  },

  // 跳转订单列表页
  goOrderList(e: any) {
    const filter = e.currentTarget.dataset.filter || 'all';
    wx.navigateTo({ url: '/pages/order-list/order-list?filter=' + filter });
  },

  // ========== 菜单点击 ==========
  onMenuTap(e: any) {
    const key = e.currentTarget.dataset.key;
    const handlers: Record<string, () => void> = {
      verify: () => wx.navigateTo({ url: '/pages/driver-verify/driver-verify' }),
      admin_verify: () => wx.navigateTo({ url: '/pages/admin-verify/admin-verify' }),
      saved_places: () => wx.navigateTo({ url: '/pages/saved-places/saved-places' }),
      wallet: () => wx.navigateTo({ url: '/pages/wallet/wallet' }),
      coupon: () => wx.showToast({ title: '优惠券功能开发中', icon: 'none' }),
      settings: () => wx.navigateTo({ url: '/pages/settings/settings' }),
      help: () => wx.navigateTo({ url: '/pages/help/help' }),
    };
    (handlers[key] || (() => {}))();
  },

  // ========== 司机认证状态 ==========
  checkVerifyStatus() {
    const token = wx.getStorageSync('token');
    if (!token) return;

    request({
      url: BASE_URL + '/api/verify/status',
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        const status = res.data.data.status;
        const statusMap: Record<string, string> = {
          approved: '已认证',
          pending: '审核中',
          rejected: '未通过',
          none: '去认证',
        };
        this.setData({
          verifyStatus: status,
          verifyStatusText: statusMap[status] || '',
        });
      }
    }).catch(() => {});
  },

  // ========== 退出登录 ==========
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('role');
          wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  }
});
