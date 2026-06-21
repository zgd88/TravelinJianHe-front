import { BASE_URL , request } from '../../utils/api';
// pages/share-ride/share-ride.ts
Page({
  data: {
    pickupLat: 0,
    pickupLng: 0,
    pickupAddr: '',
    destLat: 0,
    destLng: 0,
    destAddr: '',
    matches: [] as any[],
    loading: true,
    mode: 'match', // 'match' | 'waiting'
    newOrderId: 0,
    waitSeconds: 0,
  },
  _timer: 0 as any,

  onLoad(options: any) {
    if (options.pickupLat) this.setData({
      pickupLat: parseFloat(options.pickupLat),
      pickupLng: parseFloat(options.pickupLng),
      pickupAddr: decodeURIComponent(options.pickupAddr || ''),
      destLat: parseFloat(options.destLat),
      destLng: parseFloat(options.destLng),
      destAddr: decodeURIComponent(options.destAddr || ''),
    });
    this.loadMatches();
  },

  onUnload() { if (this._timer) clearInterval(this._timer); },
  onHide() { if (this._timer) clearInterval(this._timer); },

  // 加载可拼的订单
  loadMatches() {
    const token = wx.getStorageSync('token');
    const { pickupLat, pickupLng, destLat, destLng } = this.data;

    request({
      url: BASE_URL + `/api/order/share-match?pickupLat=${pickupLat}&pickupLng=${pickupLng}&destLat=${destLat}&destLng=${destLng}`,
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + (token || '') }
    }).then((res: any) => {
      if (res.data.code === 200) {
        const matches = (res.data.data || []).map((m: any) => ({
          ...m,
          pickupDist: m.distToPickup ? m.distToPickup.toFixed(1) + 'km' : '',
          destDist: m.distToDest ? m.distToDest.toFixed(1) + 'km' : '',
        }));
        this.setData({ matches, loading: false });
      } else {
        this.setData({ loading: false });
      }
    }).catch(() => { this.setData({ loading: false }); });
  },

  // 加入拼车
  joinShare(e: any) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '加入拼车',
      content: `乘客：${item.passengerName}\n上车点：${item.pickupAddr}\n目的地：${item.destAddr}\n距你上车点${item.pickupDist}`,
      confirmText: '加入',
      success: (res) => {
        if (res.confirm) this.doJoin(item);
      }
    });
  },

  doJoin(item: any) {
    const token = wx.getStorageSync('token');
    const { pickupLat, pickupLng, pickupAddr, destLat, destLng, destAddr } = this.data;

    request({
      url: BASE_URL + '/api/order/join/' + item.id,
      method: 'POST',
      data: { pickupLat, pickupLng, pickupAddr, destLat, destLng, destAddr },
      header: { 'Authorization': 'Bearer ' + (token || '') }
    }).then((res: any) => {
      if (res.data.code === 200) {
        wx.showToast({ title: '拼车成功！', icon: 'success' });
        setTimeout(() => wx.navigateBack({ delta: 2 }), 1000);
      } else {
        wx.showToast({ title: res.data.msg, icon: 'none' });
      }
    });
  },

  // 发起新的拼车单
  createShare() {
    wx.showModal({
      title: '发起拼车',
      content: '暂时没有可拼的订单，是否发起新拼车单？系统将为您匹配同路乘客。',
      confirmText: '发起',
      success: (res) => { if (res.confirm) this.doCreate(); }
    });
  },

  doCreate() {
    const token = wx.getStorageSync('token');
    const { pickupLat, pickupLng, pickupAddr, destLat, destLng, destAddr } = this.data;

    request({
      url: BASE_URL + '/api/order/create',
      method: 'POST',
      data: {
        pickupLat, pickupLng, pickupAddr,
        destLat, destLng, destAddr,
        rideType: 'share'
      },
      header: { 'Authorization': 'Bearer ' + (token || '') }
    }).then((res: any) => {
      if (res.data.code === 200) {
        const orderId = res.data.data.orderId;
        this.setData({ mode: 'waiting', newOrderId: orderId, waitSeconds: 0 });
        this.startPolling(orderId);
      } else {
        wx.showToast({ title: res.data.msg || '发起失败', icon: 'none' });
      }
    });
  },

  startPolling(orderId: number) {
    const token = wx.getStorageSync('token');
    this._timer = setInterval(() => {
      this.setData({ waitSeconds: this.data.waitSeconds + 1 });
      request({
        url: BASE_URL + '/api/order/status/' + orderId,
        method: 'GET',
        header: { 'Authorization': 'Bearer ' + (token || '') }
      }).then((res: any) => {
        if (res.data.code === 200 && res.data.data && res.data.data.status !== 'pending') {
          clearInterval(this._timer);
          wx.redirectTo({
            url: '/pages/riding/riding?orderId=' + orderId + '&destination=' + encodeURIComponent(this.data.destAddr)
          });
        }
      });
    }, 3000);
  },
});
