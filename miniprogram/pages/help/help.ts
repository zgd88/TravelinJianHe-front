// pages/help/help.ts
Page({
  data: {
    version: '1.0.0',
  },

  goFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请联系客服\n\n客服微信：TravelInJianHe',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  goAbout() {
    wx.showModal({
      title: '关于剑河出行',
      content: '版本 1.0.0\n\n一款便捷的打车小程序\n支持乘客叫车与司机接单\n实时位置追踪',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  goFAQ() {
    wx.showModal({
      title: '常见问题',
      content: 'Q: 如何叫车？\nA: 在地图上选点或搜索目的地，点击叫车按钮\n\nQ: 如何成为司机？\nA: 在"我的"页面切换为司机，完成资质认证\n\nQ: 如何联系司机？\nA: 行程页面有联系司机按钮',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
