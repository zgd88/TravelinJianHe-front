import { BASE_URL } from '../../utils/api';
// pages/finish/finish.ts
Page({
  data: {
    orderId: 0,
    loading: true,
    // 订单数据
    totalPrice: '0',
    distance: '--',
    driverName: '司机',
    driverPhoneMasked: '',
    carPlate: '',
    carModel: '',
    carColor: '',
    // 评价
    rating: 0,
    ratingSubmitted: false,
    // 地图
    latitude: 30.6598,
    longitude: 104.0634,
    scale: 14,
    markers: [] as any[],
    polyline: [] as any[],
  },

  onLoad(options: any) {
    if (options.orderId) {
      this.setData({ orderId: parseInt(options.orderId) });
    }
    this.loadOrderDetail();
  },

  // 加载订单真实数据
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
        const dist = this.calcDistance(
          order.pickup_lat, order.pickup_lng,
          order.dest_lat, order.dest_lng
        );

        this.setData({
          loading: false,
          totalPrice: String(order.price || 0),
          distance: dist.toFixed(1),
          driverName: order.driver_name || '司机',
          driverPhoneMasked: order.driver_phone_masked || '',
          carPlate: order.vehicle_plate || '',
          carModel: order.vehicle_model || '',
          carColor: order.vehicle_color || '',
          rating: order.rating || 0,
          ratingSubmitted: order.rating > 0,
        });
        this.setupMap(order);
      } else {
        this.setData({ loading: false });
      }
    }).catch(() => {
      this.setData({ loading: false });
    });
  },

  calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  setupMap(order: any) {
    const pickupLat = order.pickup_lat || 30.6598;
    const pickupLng = order.pickup_lng || 104.0634;
    const destLat = order.dest_lat || 30.5754;
    const destLng = order.dest_lng || 104.0654;

    const markers: any[] = [
      {
        id: 1, latitude: pickupLat, longitude: pickupLng,
        width: 20, height: 32,
        iconPath: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyMCAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI4IiBmaWxsPSIjMDdjMTYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
        callout: { content: '起', fontSize: 11, padding: 4, display: 'ALWAYS', borderRadius: 4 }
      },
      {
        id: 2, latitude: destLat, longitude: destLng,
        width: 20, height: 32,
        iconPath: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyMCAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI4IiBmaWxsPSIjZmY2YjAwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
        callout: { content: '终', fontSize: 11, padding: 4, display: 'ALWAYS', borderRadius: 4 }
      }
    ];

    const polyline: any[] = [{
      points: [
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: destLat, longitude: destLng }
      ],
      color: '#ff6b00', width: 5, arrowLine: true
    }];

    this.setData({
      latitude: pickupLat, longitude: pickupLng,
      markers, polyline
    });
  },

  // 评价
  setRating(e: any) {
    if (this.data.ratingSubmitted) return;
    const rating = e.currentTarget.dataset.rating;
    this.setData({ rating });
  },

  submitRating() {
    if (this.data.ratingSubmitted) {
      wx.showToast({ title: '您已评价过', icon: 'none' });
      return;
    }
    if (this.data.rating === 0) {
      wx.showToast({ title: '请先选择评分', icon: 'none' });
      return;
    }

    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + '/api/order/rate/' + this.data.orderId,
      method: 'POST',
      data: { rating: this.data.rating, comment: '' },
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        this.setData({ ratingSubmitted: true });
        wx.showToast({ title: '评价成功，感谢反馈！', icon: 'success' });
      } else {
        wx.showToast({ title: res.data.msg || '评价失败', icon: 'none' });
      }
    }).catch(() => {
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  },

  goHome() {
    wx.redirectTo({ url: '/pages/index/index' });
  },
});
