import { BASE_URL } from '../../utils/api';
// pages/search/search.ts
const { DEFAULT_LOCATION } = require('../../utils/map');

const POI_CATEGORIES = [
  { key: '美食', icon: '🍜', keyword: '餐厅' },
  { key: '酒店', icon: '🏨', keyword: '酒店' },
  { key: '医院', icon: '🏥', keyword: '医院' },
  { key: '加油站', icon: '⛽', keyword: '加油站' },
  { key: '商场', icon: '🛍️', keyword: '商场' },
  { key: '银行', icon: '🏦', keyword: '银行' },
];

Page({
  data: {
    keyword: '',
    loading: false,
    suggestions: [] as any[],
    showHistory: true,
    searchType: 'dest', // 'pickup' | 'dest'
    savedPlaces: [] as any[],
    historyPlaces: [] as any[],
    searchHistory: [] as string[],
    categories: [] as any[],
  },

  onLoad(options: any) {
    this.setData({ categories: POI_CATEGORIES, searchType: (options && options.type) || 'dest' });
    this.loadSavedPlaces();
    this.loadHistoryPlaces();
    this.loadSearchHistory();
    this.getUserLocation();
  },

  // 获取当前位置
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        (this as any)._userLat = res.latitude;
        (this as any)._userLng = res.longitude;
      }
    });
  },

  // 从最近订单加载历史目的地
  loadHistoryPlaces() {
    const token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: BASE_URL + '/api/order/my-orders',
      method: 'GET',
    }).then((res: any) => {
      if (res.data.code === 200) {
        const orders = res.data.data || [];
        const seen = new Set<string>();
        const places: any[] = [];
        for (const o of orders) {
          if (o.dest_addr && !seen.has(o.dest_addr)) {
            seen.add(o.dest_addr);
            places.push({
              name: o.dest_addr,
              address: o.dest_addr,
              latitude: o.dest_lat,
              longitude: o.dest_lng
            });
          }
          if (places.length >= 5) break;
        }
        this.setData({ historyPlaces: places });
      }
    }).catch(() => {});
  },

  // 加载收藏地址
  loadSavedPlaces() {
    const places = wx.getStorageSync('savedPlaces') || [];
    this.setData({ savedPlaces: places });
  },

  // 加载本地搜索历史
  loadSearchHistory() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ searchHistory: history.slice(0, 10) });
  },

  // 保存搜索记录
  saveSearchHistory(keyword: string) {
    let history: string[] = wx.getStorageSync('searchHistory') || [];
    history = history.filter(h => h !== keyword);
    history.unshift(keyword);
    if (history.length > 20) history = history.slice(0, 20);
    wx.setStorageSync('searchHistory', history);
    this.setData({ searchHistory: history.slice(0, 10) });
  },

  // 清除搜索历史
  clearHistory() {
    wx.showModal({
      title: '清除记录',
      content: '确定清除所有搜索记录？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory');
          this.setData({ searchHistory: [] });
        }
      }
    });
  },

  // ========== 输入搜索 ==========
  onSearchInput(e: any) {
    const keyword = e.detail.value;
    this.setData({ keyword, showHistory: false });

    if ((this as any)._searchDebounce) clearTimeout((this as any)._searchDebounce);
    if (keyword.trim().length >= 1) {
      (this as any)._searchDebounce = setTimeout(() => this.searchLocation(keyword), 300);
    } else {
      this.setData({ suggestions: [], showHistory: true });
    }
  },

  searchLocation(keyword: string) {
    if (!keyword.trim()) return;
    this.setData({ loading: true });
    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + `/api/map/place-suggestion?keyword=${encodeURIComponent(keyword)}`,
      method: 'GET',
    }).then((res: any) => {
      const data = res.data;
      if (data && data.status === 0 && data.data) {
        this.setData({ suggestions: data.data.slice(0, 10), loading: false });
      } else {
        this.setData({ suggestions: [], loading: false });
      }
    }).catch(() => {
      const filtered = this.data.historyPlaces.filter((p: any) =>
        p.name.includes(keyword) || p.address.includes(keyword)
      ).map((p: any) => ({
        id: 0, title: p.name, address: p.address,
        location: { lat: p.latitude, lng: p.longitude }
      }));
      this.setData({ suggestions: filtered, loading: false });
    });
  },

  onSearchConfirm() {
    const { keyword } = this.data;
    if (keyword.trim()) {
      this.searchLocation(keyword);
      this.saveSearchHistory(keyword.trim());
    }
  },

  // 点击搜索历史关键词
  tapHistory(e: any) {
    const kw = e.currentTarget.dataset.kw;
    this.setData({ keyword: kw, showHistory: false });
    this.searchLocation(kw);
  },

  clearKeyword() {
    this.setData({ keyword: '', suggestions: [], showHistory: true });
  },

  // ========== POI 分类搜索 ==========
  searchCategory(e: any) {
    const { keyword } = e.currentTarget.dataset;
    const lat = (this as any)._userLat || DEFAULT_LOCATION.latitude;
    const lng = (this as any)._userLng || DEFAULT_LOCATION.longitude;

    this.setData({ keyword: '', showHistory: false, loading: true });
    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + `/api/map/place-search?keyword=${encodeURIComponent(keyword)}&lat=${lat}&lng=${lng}`,
      method: 'GET',
    }).then((res: any) => {
      const data = res.data;
      if (data && data.status === 0 && Array.isArray(data.data)) {
        this.setData({ suggestions: data.data, loading: false });
      } else {
        wx.showToast({ title: '暂无结果', icon: 'none' });
        this.setData({ loading: false, showHistory: true });
      }
    }).catch(() => {
      wx.showToast({ title: '搜索失败', icon: 'none' });
      this.setData({ loading: false, showHistory: true });
    });
  },

  goSaved() {
    wx.navigateTo({ url: '/pages/saved-places/saved-places' });
  },

  // ========== 选择地点 ==========
  selectPlace(e: any) {
    const item = e.currentTarget.dataset.item;

    let destination: string;
    let latitude: number;
    let longitude: number;

    if (item.title) {
      // API 搜索结果
      destination = item.title;
      latitude = item.location.lat;
      longitude = item.location.lng;
      this.saveSearchHistory(item.title);
    } else if (item.label) {
      // 收藏地址
      destination = item.address;
      latitude = item.lat;
      longitude = item.lng;
    } else {
      destination = item.name;
      latitude = item.latitude;
      longitude = item.longitude;
    }

    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    if (prevPage) {
      if (this.data.searchType === 'pickup') {
        prevPage.setData({
          latitude: latitude,
          longitude: longitude,
          pickupAddr: destination,
        });
      } else if (this.data.searchType === 'route') {
        prevPage.setDestAndRoute(destination, latitude, longitude);
      } else if (this.data.searchType === 'carpool_pickup') {
        prevPage.setCarpoolPickup(destination, latitude, longitude);
      } else if (this.data.searchType === 'carpool_dest') {
        prevPage.setCarpoolDest(destination, latitude, longitude);
      } else {
        prevPage.setData({
          destination: destination,
          destLatitude: latitude,
          destLongitude: longitude
        });
      }
    }

    wx.navigateBack({ delta: 1 });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
