// pages/saved-places/saved-places.ts
Page({
  data: {
    places: [] as any[],
    showAdd: false,
    // 表单
    label: '',
    address: '',
    labelIndex: 0,
    labels: ['家', '公司', '学校', '自定义'],
    // 坐标
    lat: 0,
    lng: 0,
  },

  onShow() {
    this.loadPlaces();
  },

  loadPlaces() {
    const places = wx.getStorageSync('savedPlaces') || [];
    this.setData({ places });
  },

  // ========== 添加 ==========
  openAdd() {
    this.setData({ showAdd: true, label: '', address: '', lat: 0, lng: 0, labelIndex: 0 });
  },
  closeAdd() {
    this.setData({ showAdd: false });
  },

  onLabelChange(e: any) {
    const idx = e.detail.value;
    this.setData({ labelIndex: idx });
  },
  onAddressInput(e: any) {
    this.setData({ address: e.detail.value });
  },

  // 在地图上选点
  pickLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          address: res.name || res.address,
          lat: res.latitude,
          lng: res.longitude,
        });
      }
    });
  },

  // 搜索地址
  searchAddress() {
    wx.navigateTo({ url: '/pages/search/search?mode=select' });
  },

  savePlace() {
    const { labelIndex, labels, address, lat, lng } = this.data;
    if (!address.trim()) {
      wx.showToast({ title: '请输入地址', icon: 'none' }); return;
    }

    const label = labels[labelIndex] === '自定义' ? '自定义' : labels[labelIndex];
    const newPlace = { id: Date.now(), label, address: address.trim(), lat, lng };
    const places = wx.getStorageSync('savedPlaces') || [];
    places.push(newPlace);
    wx.setStorageSync('savedPlaces', places);

    this.setData({ showAdd: false });
    this.loadPlaces();
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  // ========== 删除 ==========
  deletePlace(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除地址',
      content: '确定删除该收藏地址？',
      success: (res) => {
        if (res.confirm) {
          let places = wx.getStorageSync('savedPlaces') || [];
          places = places.filter((p: any) => p.id !== id);
          wx.setStorageSync('savedPlaces', places);
          this.loadPlaces();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // ========== 选择地址作为目的地 ==========
  selectPlace(e: any) {
    const item = e.currentTarget.dataset.item;
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    if (prevPage) {
      prevPage.setData({
        destination: item.address,
        destLatitude: item.lat,
        destLongitude: item.lng,
        latitude: item.lat,
        longitude: item.lng,
      });
    }
    wx.navigateBack({ delta: 1 });
  },
});
