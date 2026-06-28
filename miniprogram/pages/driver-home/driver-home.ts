import { BASE_URL } from '../../utils/api';
import api from '../../utils/api';

Page({
  data: {
    orders: [] as any[],
    myOrders: [] as any[],
    filteredMyOrders: [] as any[],
    myFilter: 'all',
    verifyStatus: 'loading',
    rejectReason: '',
    // 今日统计
    todayTrips: 0,
    todayIncome: '0',
    avgRating: '0',
    ratingCount: 0,
    // 在线状态
    isOnline: true,
    // tab 切换: 'pending' | 'mine'
    activeTab: 'pending',
    // 顺风车
    carpoolOrders: [] as any[],
    hasOpenCarpool: false,
  },

  onLoad() {
    this.checkVerification();
    this.loadTabData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function') this.getTabBar().setData({ selected: 0 });
    this.checkVerification();
    this.loadTabData();
    if (this.data.isOnline) this.startAutoRefresh();
  },

  onPullDownRefresh() {
    this.loadTabData();
    setTimeout(() => wx.stopPullDownRefresh(), 800);
  },

  loadTabData() {
    const tab = this.data.activeTab;
    this.loadTodayStats();
    this.loadRating();
    if (tab === 'pending') this.loadOrders();
    else if (tab === 'mine') this.loadMyOrders();
    else if (tab === 'carpool') this.loadCarpools();
  },

  // ========== 认证检查 ==========
  checkVerification() {
    const token = wx.getStorageSync('token');
    if (!token) { this.setData({ verifyStatus: 'none' }); return; }

    let settled = false;
    const done = (status: string, rejectReason?: string) => {
      if (settled) return;
      settled = true;
      this.setData({ verifyStatus: status, rejectReason: rejectReason || '' });
    };

    // 5秒超时兜底
    setTimeout(() => done('approved'), 5000);

    api({ url: BASE_URL + '/api/verify/status', showError: false }).then((res: any) => {
      try {
        if (res.code === 200 && res.data) {
          done(res.data.status, res.data.reject_reason);
        } else {
          done('approved');
        }
      } catch (e) {
        done('approved');
      }
    });
  },

  goVerify() {
    wx.navigateTo({ url: '/pages/driver-verify/driver-verify' });
  },

  goCarpoolPublish() {
    wx.navigateTo({ url: '/pages/carpool-publish/carpool-publish' });
  },
  goCarpoolDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/carpool-detail/carpool-detail?id=' + id });
  },
  loadCarpools() {
    api({ url: BASE_URL + '/api/carpool/my-with-orders', showError: false }).then((res: any) => {
      if (res.code === 200) {
        const statusMap: Record<string, string> = { open: '进行中', closed: '已结束', cancelled: '已取消' };
        const carpoolOrders = (res.data || []).map((c: any) => ({
          id: c.id,
          pickupAddr: c.pickupAddr,
          destAddr: c.destAddr,
          departTime: c.departTime ? c.departTime.slice(5, 16).replace('T', ' ') : '',
          price: c.price,
          seats: c.seats,
          status: c.status,
          statusText: statusMap[c.status] || c.displayStatus || '进行中',
        }));
        // 检查是否有 open 状态的订单
        const hasOpen = carpoolOrders.some((c: any) => c.status === 'open');
        this.setData({ carpoolOrders, hasOpenCarpool: hasOpen });
        if (this.data.myFilter === 'carpool') {
          this.setData({ filteredMyOrders: carpoolOrders as any[] });
        }
      }
    });
  },
  goEarnings() {
    wx.navigateTo({ url: '/pages/earnings/earnings' });
  },

  // ========== 评分 ==========
  loadRating() {
    api({ url: BASE_URL + '/api/order/driver-rating', showError: false }).then((res: any) => {
      if (res.code === 200 && res.data) {
        this.setData({
          avgRating: Number(res.data.avg_rating || 0).toFixed(1),
          ratingCount: res.data.count || 0,
        });
      }
    });
  },

  // ========== 今日统计 ==========
  loadTodayStats() {
    api({ url: BASE_URL + '/api/order/driver-today', showError: false }).then((res: any) => {
      if (res.code === 200) {
        const d = res.data;
        this.setData({
          todayTrips: d.trips || 0,
          todayIncome: Number(d.income || 0).toFixed(2)
        });
      }
    });
  },

  // ========== 当前订单 ==========
  loadMyOrders() {
    api({ url: BASE_URL + '/api/order/driver-active', showError: false }).then((res: any) => {
      if (res.code === 200) {
        const statusMap: Record<string, string> = {
          accepted: '已接单', arrived: '已到达', running: '行程中'
        };
        const orders = (res.data || []).map((o: any) => ({
          ...o,
          statusText: statusMap[o.status] || o.status
        }));
        this.setData({ myOrders: orders });
        this.applyMyFilter();
      }
    }).catch(() => {});
  },

  setMyFilter(e: any) {
    this.setData({ myFilter: e.currentTarget.dataset.filter });
    this.applyMyFilter();
  },

  applyMyFilter() {
    const { myOrders, myFilter } = this.data;
    const filtered = myFilter === 'all'
      ? myOrders
      : myOrders.filter((o: any) => o.status === myFilter);
    this.setData({ filteredMyOrders: filtered });
  },

  goMyOrder(e: any) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/driver-detail/driver-detail?orderId=' + orderId });
  },

  // ========== 待接订单 ==========
  loadOrders() {
    wx.getLocation({
      type: 'gcj02',
      success: (loc) => {
        api({ url: BASE_URL + '/api/order/pending?lat=' + loc.latitude + '&lng=' + loc.longitude, showError: false }).then((res: any) => {
          if (res.code === 200) {
            const data = res.data;
            const newOrders = Array.isArray(data) ? data : [];
            if (newOrders.length > 0 && newOrders.length > this.data.orders.length) {
              wx.vibrateShort({ type: 'heavy' });
            }
            this.setData({ orders: newOrders });
          } else {
            this.setData({ orders: [] });
          }
        });
      },
      fail: () => {
        api({ url: BASE_URL + '/api/order/pending', showError: false }).then((res: any) => {
          if (res.code === 200) {
            this.setData({ orders: Array.isArray(res.data) ? res.data : [] });
          }
        });
      }
    });
  },

  acceptOrder(e: any) {
    const orderId = e.currentTarget.dataset.id;
    api({ url: BASE_URL + '/api/order/accept/' + orderId, method: 'POST' }).then((res: any) => {
      if (res.code === 200) {
        wx.showToast({ title: '接单成功', icon: 'success' });
        wx.navigateTo({ url: '/pages/driver-detail/driver-detail?orderId=' + orderId });
      }
    });
  },

  // ========== Tab 切换 ==========
  switchTab(e: any) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    this.loadTabData();
  },

  // ========== 在线/离线 ==========
  toggleOnline() {
    const online = !this.data.isOnline;
    this.setData({ isOnline: online });
    if (online) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  },

  _refreshTimer: 0 as any,

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.loadOrders();
    (this as any)._refreshTimer = setInterval(() => {
      if (this.data.activeTab === 'pending') {
        this.loadOrders();
      }
    }, 10000);
  },

  stopAutoRefresh() {
    if ((this as any)._refreshTimer) {
      clearInterval((this as any)._refreshTimer);
      (this as any)._refreshTimer = 0;
    }
  },

  onHide() {
    this.stopAutoRefresh();
  },

  onUnload() {
    this.stopAutoRefresh();
  },
});
