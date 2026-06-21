import { BASE_URL , request } from '../../utils/api';
// pages/route-plan/route-plan.ts
import { calcFare } from '../../utils/geo';

Page({
  data: {
    pickupLat: 0,
    pickupLng: 0,
    pickupAddr: '',
    destAddr: '',
    destLat: 0,
    destLng: 0,
    // 地图
    latitude: 30.6598,
    longitude: 104.0634,
    scale: 13,
    markers: [] as any[],
    polylines: [] as any[],
    // 路线数据
    routes: [] as any[],
    selectedIndex: 0,
    loading: false,
    errorMsg: '',
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  // 拦截原生导航栏返回（或 goBack）时清除首页路线数据
  onUnload() {
    if ((this as any)._confirmed) return;
    const pages = getCurrentPages();
    const indexPage = pages[pages.length - 2];
    if (indexPage) {
      indexPage.setData({
        destination: '', destLatitude: 0, destLongitude: 0,
        estimateDistance: '', estimatePrice: '', markers: [], polyline: [], routePoints: [],
        showCallBtns: false
      });
    }
  },

  onLoad(options: any) {
    if (options.pickupLat) this.setData({
      pickupLat: parseFloat(options.pickupLat),
      pickupLng: parseFloat(options.pickupLng),
      pickupAddr: decodeURIComponent(options.pickupAddr || ''),
      latitude: parseFloat(options.pickupLat),
      longitude: parseFloat(options.pickupLng),
    });
    if (options.destAddr) {
      this.setData({ destAddr: decodeURIComponent(options.destAddr) });
    }
  },

  onShow() {
    // 从搜索页返回后，如果有新目的地就加载路线
    if (this.data.destLat && this.data.destLng && (this as any)._needLoadRoutes) {
      (this as any)._needLoadRoutes = false;
      this.loadRoutes(this.data.destLat, this.data.destLng);
    }
  },

  goSearchDest() {
    wx.navigateTo({ url: '/pages/search/search?type=route' });
  },

  // 从search页返回后，接收目的地（暂存，等onShow回到前台再加载路线）
  setDestAndRoute(addr: string, lat: number, lng: number) {
    this.setData({ destAddr: addr, destLat: lat, destLng: lng, latitude: lat, longitude: lng });
    (this as any)._needLoadRoutes = true;
  },

  // 调用腾讯地图驾车路线规划 API（通过后端代理）
  loadRoutes(destLat?: number, destLng?: number) {
    const { pickupLat, pickupLng } = this.data;
    const toLat = destLat || this.data.destLat;
    const toLng = destLng || this.data.destLng;
    if (!toLat || !toLng) return;

    this.setData({ loading: true, errorMsg: '' });
    const token = wx.getStorageSync('token');

    request({
      url: BASE_URL + `/api/map/direction?from=${pickupLat},${pickupLng}&to=${toLat},${toLng}`,
      method: 'GET',
    }).then((res: any) => {
      const data = res.data;
      if (data.status === 0 && data.result) {
        const routes = (data.result.routes || []).map((r: any) => ({
          ...r,
          timeText: Math.round(r.duration || 0) + '分钟',
          distText: ((r.distance || 0) / 1000).toFixed(1) + '公里',
          fare: this.calcFareByDistance(r.distance / 1000),
          fareText: '¥' + this.calcFareByDistance(r.distance / 1000).toString(),
        }));
        this.setData({ routes, selectedIndex: 0, loading: false });
        this.updateMap(routes, 0);
        if (routes.length === 0) {
          this.setData({ errorMsg: '未找到可行路线' });
        }
      } else {
        this.setData({ loading: false, errorMsg: data.message || '路线规划失败' });
      }
    }).catch((err: any) => {
      console.error('路线规划请求失败:', err);
      this.setData({ loading: false, errorMsg: '网络请求失败' });
    });
  },

  // 更新地图展示
  updateMap(routes: any, selected: number) {
    const { pickupLat, pickupLng, pickupAddr, destLat, destLng, destAddr } = this.data;

    const markers: any[] = [
      { id: 1, latitude: pickupLat, longitude: pickupLng, width: 30, height: 40, label: { content: '起', fontSize: 13, color: '#fff', bgColor: '#07c160', borderRadius: 8, padding: 6, anchorX: -10, anchorY: -30 }, callout: { content: pickupAddr || '出发', fontSize: 12, padding: 6, borderRadius: 4, display: 'BYCLICK' } },
      { id: 2, latitude: destLat, longitude: destLng, width: 30, height: 40, label: { content: '终', fontSize: 13, color: '#fff', bgColor: '#ff4d4f', borderRadius: 8, padding: 6, anchorX: -10, anchorY: -30 }, callout: { content: destAddr || '目的地', fontSize: 12, padding: 6, borderRadius: 4, display: 'BYCLICK' } }
    ];

    const polylines: any[] = routes.map((r: any, i: number) => {
      const points = this.polylineToPoints(r.polyline);
      const isSelected = i === selected;
      console.log('路线' + i + ' polyline类型:', typeof r.polyline, '点数:', points.length, '前3点:', points.slice(0, 3));
      return {
        points,
        color: isSelected ? '#07c160' : '#7ec8f8',
        width: isSelected ? 8 : 6,
        dottedLine: false,
      };
    });

    console.log('设置地图数据 markers:', markers.length, 'polylines:', polylines.length);
    this.setData({ markers, polylines });

    // 缩放地图
    const mapCtx = wx.createMapContext('routeMap', this);
    mapCtx.includePoints({
      points: [
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: destLat, longitude: destLng }
      ],
      padding: [80, 50, 360, 50]
    });
  },

  // 解析 polyline 为坐标数组（兼容数组格式 [lat,lng,lat,lng...] 和编码字符串）
  polylineToPoints(data: any): any[] {
    if (!data) return [];
    // 数组格式：第一对是绝对坐标，后续是差分偏移量（单位1e-6度）
    if (Array.isArray(data)) {
      const pts: any[] = [];
      let lat = data[0], lng = data[1];
      pts.push({ latitude: lat, longitude: lng });
      for (let i = 2; i < data.length - 1; i += 2) {
        lat += data[i] / 1e6;
        lng += data[i + 1] / 1e6;
        pts.push({ latitude: lat, longitude: lng });
      }
      return pts;
    }
    // 编码字符串格式
    if (typeof data !== 'string') return [];
    const points: any[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < data.length) {
      let shift = 0, result = 0;
      let b;
      do {
        b = data.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0; result = 0;
      do {
        b = data.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.push({ latitude: lat / 1e6, longitude: lng / 1e6 });
    }
    return points;
  },

  // 选择路线
  selectRoute(e: any) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedIndex: index });
    this.updateMap(this.data.routes, index);
  },

  // 确认选择
  confirmRoute() {
    const { routes, selectedIndex, destAddr, destLat, destLng } = this.data;
    const route = routes[selectedIndex];
    if (!route) return;

    const pages = getCurrentPages();
    const indexPage = pages[pages.length - 2];
    if (indexPage) {
      const distance = (route.distance / 1000).toFixed(1);
      const duration = Math.round(route.duration / 60);
      const fare = this.calcFareByDistance(parseFloat(distance));
      const routePoints = this.polylineToPoints(route.polyline);
      indexPage.setData({
        destination: destAddr,
        destLatitude: destLat,
        destLongitude: destLng,
        estimateDistance: distance,
        estimatePrice: '¥' + fare.toString(),
        routePoints: routePoints,
      });
    }
    (this as any)._confirmed = true;
    wx.navigateBack({ delta: 1 });
  },

  calcFareByDistance(dist: number): number {
    return Math.round(calcFare(dist));
  },

  // 格式化
  formatDistance(m: number): string {
    return m >= 1000 ? (m / 1000).toFixed(1) + 'km' : m + 'm';
  },
  formatDuration(sec: number): string {
    return sec >= 3600 ? Math.floor(sec / 3600) + 'h' + Math.round((sec % 3600) / 60) + 'min'
      : Math.round(sec / 60) + '分钟';
  },
});
