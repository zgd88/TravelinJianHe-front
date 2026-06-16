import { BASE_URL } from '../../utils/api';
// pages/order/order.ts
Page({
  data: {
    orderId: 0,
    orderNo: '',
    orderStatus: 'pending',
    statusTitle: '正在匹配司机...',
    statusDesc: '请稍候，正在为您寻找附近司机',

    destination: '',
    estimatePrice: '--',
    estimateTime: '--',
    estimateDistance: '--',

    waitSeconds: 0,
    waitTimer: null as any,
    pollTimer: null as any,
  },

  onLoad(options: any) {
    if (options.orderId) {
      this.setData({ orderId: parseInt(options.orderId) });
    }
    if (options.destination) {
      this.setData({ destination: decodeURIComponent(options.destination) });
    }

    this.loadOrderDetail();
    this.startWaiting();
    this.checkOrderStatus();
    this.startPolling();
  },

  onUnload() {
    this.clearTimers();
  },

  clearTimers() {
    if (this.data.waitTimer) clearInterval(this.data.waitTimer);
    if (this.data.pollTimer) clearInterval(this.data.pollTimer);
  },

  // 加载订单详情获取真实估算
  loadOrderDetail() {
    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + '/api/order/status/' + this.data.orderId,
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        const order = res.data.data;
        const dest = order.dest_addr || this.data.destination;
        const dist = this.calcDistance(order.pickup_lat, order.pickup_lng, order.dest_lat, order.dest_lng);
        const price = this.calcFare(order.pickup_lat, order.pickup_lng, order.dest_lat, order.dest_lng);
        // 估算时间：按城市速度 30km/h
        const eta = Math.max(3, Math.round(dist / 30 * 60));

        this.setData({
          orderNo: order.order_no || '',
          destination: dest,
          estimateDistance: dist.toFixed(1),
          estimatePrice: price.toFixed(2),
          estimateTime: String(eta),
        });
      }
    }).catch(() => {});
  },

  calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  calcFare(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dist = this.calcDistance(lat1, lng1, lat2, lng2);
    const fare = dist <= 3 ? 8 : 8 + (dist - 3) * 2;
    return Math.round(fare * 100) / 100;
  },

  startWaiting() {
    this.setData({ waitSeconds: 0 });
    this.data.waitTimer = setInterval(() => {
      const seconds = this.data.waitSeconds + 1;
      this.setData({ waitSeconds: seconds });
      if (seconds > 30) {
        this.setData({ statusDesc: '附近司机较少，请耐心等待...' });
      }
    }, 1000);
  },

  startPolling() {
    this.data.pollTimer = setInterval(() => {
      this.checkOrderStatus();
    }, 3000);
  },

  checkOrderStatus() {
    const { orderId } = this.data;
    if (!orderId) return;

    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + '/api/order/status/' + orderId,
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        const order = res.data.data;

        if (order.status === 'cancelled') {
          this.clearTimers();
          wx.showToast({ title: '订单已被取消', icon: 'none' });
          setTimeout(() => wx.navigateBack({ delta: 1 }), 1000);
          return;
        }

        if (order.status !== 'pending') {
          this.clearTimers();
          wx.redirectTo({
            url: '/pages/riding/riding?orderId=' + orderId + '&destination=' + encodeURIComponent(this.data.destination)
          });
        }
      }
    });
  },

  // 模拟接单（开发调试用）
  simulateAccept() {
    const { orderId } = this.data;
    if (!orderId) return;

    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + '/api/order/accept/' + orderId,
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        wx.showToast({ title: '司机已接单', icon: 'success' });
      } else {
        wx.showToast({ title: res.data.msg || '操作失败', icon: 'none' });
      }
    }).catch(() => {
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  // 取消订单
  cancelOrder() {
    wx.showActionSheet({
      itemList: ['司机距离远', '行程有变动', '等待时间过长', '其他原因'],
      success: (res) => {
        const reasons = ['司机距离远', '行程有变动', '等待时间过长', '其他原因'];
        const reason = reasons[res.tapIndex];
        wx.showModal({
          title: '确认取消',
          content: '取消原因：' + reason + '\n确认取消本次叫车？',
          confirmText: '确认取消',
          confirmColor: '#ff4d4f',
          success: (modalRes) => {
            if (modalRes.confirm) this.doCancel(reason);
          }
        });
      }
    });
  },

  doCancel(reason: string) {
    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + '/api/order/cancel/' + this.data.orderId,
      method: 'POST',
      data: { reason },
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then(() => {
      this.clearTimers();
      wx.showToast({ title: '订单已取消', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 1000);
    }).catch(() => {
      this.clearTimers();
      wx.showToast({ title: '订单已取消', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 1000);
    });
  }
});
