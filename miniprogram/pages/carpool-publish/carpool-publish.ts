import { BASE_URL , request } from '../../utils/api';
// pages/carpool-publish/carpool-publish.ts
Page({
  data: {
    pickupAddr: '',
    pickupLat: 0,
    pickupLng: 0,
    destAddr: '',
    destLat: 0,
    destLng: 0,
    seats: 3,
    departDate: '',
    departTime: '',
    price: 0,
    submitting: false,
    errorMsg: '',
  },

  onLoad() {
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    this.setData({ departDate: dateStr, departTime: timeStr });
  },

  // 搜索出发点
  goPickupSearch() {
    wx.navigateTo({ url: '/pages/search/search?type=carpool_pickup' });
  },
  // 搜索目的地
  goDestSearch() {
    wx.navigateTo({ url: '/pages/search/search?type=carpool_dest' });
  },

  // 从search页返回后接收数据
  setCarpoolPickup(addr: string, lat: number, lng: number) {
    this.setData({ pickupAddr: addr, pickupLat: lat, pickupLng: lng });
  },
  setCarpoolDest(addr: string, lat: number, lng: number) {
    this.setData({ destAddr: addr, destLat: lat, destLng: lng });
  },

  onSeatsInput(e: any) { this.setData({ seats: parseInt(e.detail.value) || 1 }); },
  onDateChange(e: any) { this.setData({ departDate: e.detail.value }); },
  onTimeChange(e: any) { this.setData({ departTime: e.detail.value }); },
  onPriceInput(e: any) { this.setData({ price: parseFloat(e.detail.value) || 0 }); },

  submit() {
    const { pickupAddr, pickupLat, pickupLng, destAddr, destLat, destLng, seats, departDate, departTime, price } = this.data;
    if (!pickupLat || !destLat) { this.setData({ errorMsg: '请选择出发地和目的地' }); return; }
    if (!departDate || !departTime) { this.setData({ errorMsg: '请选择发车时间' }); return; }
    const departFull = departDate + ' ' + departTime + ':00';

    this.setData({ submitting: true, errorMsg: '' });
    const token = wx.getStorageSync('token');

    request({
      url: BASE_URL + '/api/carpool/publish',
      method: 'POST',
      data: { pickupAddr, pickupLat, pickupLng, destAddr, destLat, destLng, seats, departTime: departFull, price },
    }).then((res: any) => {
      if (res.data.code === 200) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => wx.navigateBack({ delta: 1 }), 1000);
      } else {
        this.setData({ errorMsg: res.data.msg || '发布失败' });
      }
    }).catch(() => {
      this.setData({ errorMsg: '网络错误' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },
});
