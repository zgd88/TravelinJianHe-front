// pages/settings/settings.ts
Page({
  data: {
    cacheSize: '0 KB',
    version: '1.0.0',
    storageInfo: '',
  },

  onShow() {
    this.getStorageInfo();
  },

  getStorageInfo() {
    try {
      const info = wx.getStorageInfoSync();
      const sizeKB = Math.round(info.currentSize);
      this.setData({
        storageInfo: `${info.keys.length} 项 · ${sizeKB} KB`,
        cacheSize: sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`,
      });
    } catch (e) {
      this.setData({ cacheSize: '未知' });
    }
  },

  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '将清除所有本地缓存数据，你需要重新登录。确定继续？',
      confirmText: '清理',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.setData({ cacheSize: '0 KB', storageInfo: '0 项 · 0 KB' });
          wx.showToast({ title: '缓存已清理', icon: 'success' });
        }
      }
    });
  },
});
