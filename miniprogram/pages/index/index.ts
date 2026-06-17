import { BASE_URL } from '../../utils/api';
// pages/index/index.ts
import { haversineKm, calcFare } from '../../utils/geo';
const { DEFAULT_LOCATION } = require('../../utils/map');

Page({
  data: {
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    scale: 17,
    destination: '',
    destLatitude: 0,
    destLongitude: 0,
    markers: [] as any[],
    polyline: [] as any[],
    routePoints: [] as any[],
    showCallBtns: false,
    calling: false,
    estimatePrice: '',
    estimateDistance: '',
    pickupAddr: '正在获取位置...',
    _geoDebounce: 0 as any,
  },

  onLoad() {
    this.getUserLocation();
  },

  onShow() {
    if (this.data.destination) {
      this.updateMarkersAndRoute();
      this.updateEstimate();
      this.setData({ showCallBtns: true });
    }
    if (typeof this.getTabBar === 'function') this.getTabBar().setData({ selected: 0 });
  },

  // 返回路线规划页重选路线
  backToRoute() {
    this.setData({ showCallBtns: false });
    this.goRoutePlan();
  },

  getCenter() {
    return {
      latitude: (this as any)._centerLat || this.data.latitude,
      longitude: (this as any)._centerLng || this.data.longitude,
    };
  },

  // ========== 定位 + 逆地理编码 ==========
  // 请求定位授权后获取位置
  doGetLocation(cb: (lat: number, lng: number) => void, fallback: () => void) {
    wx.getSetting({
      success: (setting) => {
        console.log('[定位] getSetting:', JSON.stringify(setting.authSetting));
        if (setting.authSetting['scope.userLocation']) {
          console.log('[定位] 已授权，直接获取位置');
          wx.getLocation({
            type: 'gcj02',
            success: (res) => { console.log('[定位] 成功:', res.latitude, res.longitude); cb(res.latitude, res.longitude); },
            fail: (err) => { console.error('[定位] getLocation失败:', err); fallback(); }
          });
        } else {
          console.log('[定位] 未授权，弹窗请求');
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              console.log('[定位] 授权成功，获取位置');
              wx.getLocation({
                type: 'gcj02',
                success: (res) => { console.log('[定位] 成功:', res.latitude, res.longitude); cb(res.latitude, res.longitude); },
                fail: (err) => { console.error('[定位] getLocation失败:', err); fallback(); }
              });
            },
            fail: (err) => {
              console.error('[定位] 授权被拒:', err);
              wx.showModal({
                title: '需要定位权限',
                content: '请在设置中允许使用地理位置',
                success: (modalRes) => {
                  if (modalRes.confirm) wx.openSetting();
                  fallback();
                }
              });
            }
          });
        }
      },
      fail: () => fallback()
    });
  },

  getUserLocation() {
    this.doGetLocation(
      (lat, lng) => {
        this.setData({ latitude: lat, longitude: lng });
        this.reverseGeocode(lat, lng);
      },
      () => {
        const d = DEFAULT_LOCATION;
        this.reverseGeocode(d.latitude, d.longitude);
      }
    );
  },

  locateUser() {
    this.doGetLocation(
      (lat, lng) => {
        this.setData({ latitude: lat, longitude: lng });
        (this as any)._centerLat = lat;
        (this as any)._centerLng = lng;
        this.reverseGeocode(lat, lng);
        if (this.data.destination) this.updateEstimate();
      },
      () => {
        wx.showToast({ title: '无法获取位置', icon: 'none' });
      }
    );
  },

  onMapRegionChange(e: any) {
    if (e.type === 'end') {
      const mapContext = wx.createMapContext('map', this);
      mapContext.getCenterLocation({
        success: (res) => {
          (this as any)._centerLat = res.latitude;
          (this as any)._centerLng = res.longitude;
          if (e.causedBy === 'drag') {
            this.reverseGeocode(res.latitude, res.longitude);
          }
          if (this.data.destination) this.updateEstimate();
        }
      });
    }
  },

  reverseGeocode(lat: number, lng: number) {
    if (this.data._geoDebounce) clearTimeout(this.data._geoDebounce);
    this.data._geoDebounce = setTimeout(() => {
      const token = wx.getStorageSync('token');
      wx.request({
        url: BASE_URL + `/api/map/geocoder?lat=${lat}&lng=${lng}`,
        method: 'GET',
      }).then((res: any) => {
        console.log('[逆地理] 响应:', res.data);
        if (res.data && res.data.status === 0 && res.data.result) {
          this.setData({ pickupAddr: res.data.result.address || '未知位置' });
        } else {
          console.warn('[逆地理] 失败:', res.data);
          this.setData({ pickupAddr: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
        }
      }).catch((err: any) => {
        console.error('[逆地理] 请求异常:', err);
        this.setData({ pickupAddr: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      });
    }, 500);
  },

  zoomIn() {
    this.setData({ scale: Math.min(this.data.scale + 2, 19) });
  },
  zoomOut() {
    this.setData({ scale: Math.max(this.data.scale - 2, 3) });
  },

  // ========== 搜索 ==========
  goPickupSearch() {
    wx.navigateTo({ url: '/pages/search/search?type=pickup' });
  },
  goCarpool() {
    const center = this.getCenter();
    const { pickupAddr, destLatitude, destLongitude, destination } = this.data;
    if (!destLatitude || !destLongitude) { wx.showToast({ title: '请先选择目的地', icon: 'none' }); return; }
    wx.navigateTo({
      url: `/pages/carpool-list/carpool-list?pickupLat=${center.latitude}&pickupLng=${center.longitude}&pickupAddr=${encodeURIComponent(pickupAddr)}&destLat=${destLatitude}&destLng=${destLongitude}&destAddr=${encodeURIComponent(destination)}`
    });
  },
  goShare() {
    const center = this.getCenter();
    const { pickupAddr, destLatitude, destLongitude, destination } = this.data;
    if (!destLatitude || !destLongitude) { wx.showToast({ title: '请先选择目的地', icon: 'none' }); return; }
    wx.navigateTo({
      url: `/pages/share-ride/share-ride?pickupLat=${center.latitude}&pickupLng=${center.longitude}&pickupAddr=${encodeURIComponent(pickupAddr)}&destLat=${destLatitude}&destLng=${destLongitude}&destAddr=${encodeURIComponent(destination)}`
    });
  },
  goRoutePlan() {
    const center = this.getCenter();
    const { pickupAddr } = this.data;
    const dest = this.data.destination || '';
    wx.navigateTo({
      url: `/pages/route-plan/route-plan?pickupLat=${center.latitude}&pickupLng=${center.longitude}&pickupAddr=${encodeURIComponent(pickupAddr)}&destAddr=${encodeURIComponent(dest)}`
    });
  },

  // 更新地图标记和路线
  updateMarkersAndRoute() {
    const center = this.getCenter();
    const { destLatitude, destLongitude, destination, routePoints } = this.data;
    if (!destLatitude || !destLongitude) return;

    const markers: any[] = [
      {
        id: 1, latitude: center.latitude, longitude: center.longitude,
        width: 24, height: 36,
        label: { content: '起', fontSize: 11, color: '#fff', bgColor: '#f0a050', borderRadius: 6, padding: 4, anchorY: -30 }
      },
      {
        id: 2, latitude: destLatitude, longitude: destLongitude,
        width: 24, height: 36,
        label: { content: '终', fontSize: 11, color: '#fff', bgColor: '#e08040', borderRadius: 6, padding: 4, anchorY: -30 },
        callout: { content: destination, color: '#f0a050', fontSize: 13, borderRadius: 8, padding: 8, display: 'ALWAYS' }
      }
    ];

    const points = (routePoints && routePoints.length > 0)
      ? routePoints.map((p: any) => ({ latitude: p.lat || p.latitude, longitude: p.lng || p.longitude }))
      : [
          { latitude: center.latitude, longitude: center.longitude },
          { latitude: destLatitude, longitude: destLongitude }
        ];

    const polyline: any[] = [{
      points,
      color: '#07c160',
      width: 5,
      dottedLine: false,
      arrowLine: true
    }];

    this.setData({ markers, polyline });
  },

  // ========== 费用预估 ==========
  updateEstimate() {
    const center = this.getCenter();
    const { destLatitude, destLongitude } = this.data;
    if (!destLatitude || !destLongitude) return;

    const dist = haversineKm(center.latitude, center.longitude, destLatitude, destLongitude);
    this.setData({
      estimateDistance: dist.toFixed(1),
      estimatePrice: '¥' + Math.round(calcFare(dist)).toString()
    });
  },

  // ========== 叫车 ==========
  handleCallCar() {
    const { destination, destLatitude, destLongitude, pickupAddr } = this.data;

    if (!destination) {
      wx.showToast({ title: '请输入目的地', icon: 'none' });
      return;
    }

    const mapCtx = wx.createMapContext('map', this);
    mapCtx.getCenterLocation({
      success: (centerRes) => {
        this.setData({ calling: true });

        const token = wx.getStorageSync('token');

        wx.request({
          url: BASE_URL + '/api/order/create',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          data: {
            pickupLat: centerRes.latitude,
            pickupLng: centerRes.longitude,
            pickupAddr: pickupAddr,
            destLat: destLatitude,
            destLng: destLongitude,
            destAddr: destination
          }
        }).then((res: any) => {
          if (res.data.code === 200) {
            wx.navigateTo({
              url: '/pages/order/order?orderId=' + res.data.data.orderId + '&destination=' + encodeURIComponent(destination)
            });
          } else {
            wx.showToast({ title: res.data.msg || '创建订单失败', icon: 'none' });
          }
        }).catch(() => {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }).finally(() => {
          this.setData({ calling: false });
        });
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败', icon: 'none' });
      }
    });
  },
});
