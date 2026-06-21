import { BASE_URL , request } from '../../utils/api';
// pages/choose-role/choose-role.ts
Page({
  choosePassenger() {
    wx.setStorageSync('role', 'passenger');
    wx.switchTab({ url: '/pages/index/index' });
  },

  chooseDriver() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '检查认证状态...' });

    request({
      url: BASE_URL + '/api/verify/status',
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      wx.hideLoading();

      if (res.data.code === 200) {
        const status = res.data.data.status;

        if (status === 'approved') {
          wx.setStorageSync('role', 'driver');
          wx.switchTab({ url: '/pages/driver-home/driver-home' });
        } else if (status === 'pending') {
          wx.showModal({
            title: '审核中',
            content: '您的司机认证资料正在审核中，请耐心等待',
            showCancel: false,
            confirmText: '知道了'
          });
        } else if (status === 'rejected') {
          wx.showModal({
            title: '认证未通过',
            content: '您的认证资料未通过审核，是否重新提交？',
            confirmText: '去认证',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({ url: '/pages/driver-verify/driver-verify' });
              }
            }
          });
        } else {
          // none — 跳转认证页
          wx.navigateTo({ url: '/pages/driver-verify/driver-verify' });
        }
      } else {
        // API 异常，降级放行
        wx.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
    });
  }
});
