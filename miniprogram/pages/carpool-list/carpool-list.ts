import { BASE_URL , request } from '../../utils/api';
// pages/carpool-list/carpool-list.ts
Page({
  data: {
    pickupLat: 0,
    pickupLng: 0,
    pickupAddr: '',
    destLat: 0,
    destLng: 0,
    destAddr: '',
    list: [] as any[],
    loading: true,
  },

  onLoad(options: any) {
    if (options.pickupLat) this.setData({
      pickupLat: parseFloat(options.pickupLat),
      pickupLng: parseFloat(options.pickupLng),
      pickupAddr: decodeURIComponent(options.pickupAddr || ''),
      destLat: parseFloat(options.destLat),
      destLng: parseFloat(options.destLng),
      destAddr: decodeURIComponent(options.destAddr || ''),
    });
    this.loadList();
  },

  loadList() {
    const token = wx.getStorageSync('token');
    const { pickupLat, pickupLng, destLat, destLng } = this.data;
    if (!pickupLat || !destLat) {
      this.setData({ loading: false });
      return;
    }

    request({
      url: BASE_URL + `/api/carpool/search?pickupLat=${pickupLat}&pickupLng=${pickupLng}&destLat=${destLat}&destLng=${destLng}`,
      method: 'GET',
    }).then((res: any) => {
      if (res.data.code === 200) {
        const list = (res.data.data || []).map((c: any) => ({
          ...c,
          departTimeText: c.departTime ? c.departTime.slice(5, 16).replace('T', ' ') : '',
          pickupDist: c.distToRoute ? c.distToRoute.toFixed(1) + 'km' : '',
          destDist: c.distToDest ? c.distToDest.toFixed(1) + 'km' : '',
          priceText: c.price > 0 ? '¥' + Number(c.price).toFixed(0) + '/人' : '免费',
          carInfo: [c.vehicleColor, c.vehicleModel, c.vehiclePlate].filter(Boolean).join(' ') || '暂无车辆信息',
        }));
        this.setData({ list, loading: false });
      } else {
        this.setData({ loading: false });
      }
    }).catch(() => { this.setData({ loading: false }); });
  },

  selectCarpool(e: any) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '确认搭乘',
      content: `司机：${item.driverName}\n车辆：${item.carInfo}\n时间：${item.departTimeText}\n价格：${item.priceText}\n人数：${item.seats}座`,
      confirmText: '联系司机',
      success: (res) => {
        if (res.confirm && item.driverPhone) {
          wx.makePhoneCall({ phoneNumber: item.driverPhone });
        }
      }
    });
  },
});
