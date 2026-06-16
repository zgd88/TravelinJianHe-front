import { BASE_URL } from '../../utils/api';
// pages/order-list/order-list.ts
Page({
  data: {
    orders: [] as any[],
    loading: true,
    filter: 'all',
    role: 'passenger',
    roleText: '',
  },

  onLoad(options: any) {
    if (options.filter) this.setData({ filter: options.filter });
    const role = wx.getStorageSync('role') || 'passenger';
    this.setData({ role, roleText: role === 'driver' ? '接单' : '出行' });
    this.loadOrders();
  },

  loadOrders() {
    const token = wx.getStorageSync('token');
    if (!token) { this.setData({ loading: false }); return; }

    wx.request({
      url: BASE_URL + '/api/order/my-orders',
      method: 'GET',
    }).then((res: any) => {
      if (res.data.code === 200) {
        const userId = parseInt((wx.getStorageSync('userInfo') || {}).userId || '0');
        const role = this.data.role;

        let orders = (res.data.data || []).map((o: any) => ({
          id: o.id,
          orderNo: o.order_no,
          date: o.created_at ? o.created_at.slice(0, 10) : '',
          time: o.created_at ? o.created_at.slice(11, 16) : '',
          pickup: o.pickup_addr || '上车点',
          dest: o.dest_addr || '目的地',
          price: o.price,
          status: o.status,
          statusText: (STATUS_MAP[o.status] && STATUS_MAP[o.status].text) || o.status,
          statusClass: (STATUS_MAP[o.status] && STATUS_MAP[o.status].class) || '',
          // 当前用户在订单中的角色
          myRole: o.driver_id && String(o.driver_id) === String(userId) ? 'driver' : 'passenger',
          distance: this.calcDistance(o.pickup_lat, o.pickup_lng, o.dest_lat, o.dest_lng),
        }));

        if (this.data.filter === 'completed') {
          orders = orders.filter((o: any) => o.status === 'completed');
        }

        this.setData({ orders, loading: false });
      } else {
        this.setData({ loading: false });
      }
    }).catch(() => { this.setData({ loading: false }); });
  },

  calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
    if (!lat1 || !lng1 || !lat2 || !lng2) return '';
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1) + 'km';
  },

  switchFilter(e: any) {
    this.setData({ filter: e.currentTarget.dataset.filter, loading: true });
    this.loadOrders();
  },

  showDetail(e: any) {
    const order = e.currentTarget.dataset.item;
    const roleLabel = order.myRole === 'driver' ? '作为司机' : '作为乘客';
    wx.showModal({
      title: '订单详情',
      content: [
        `订单号: ${order.orderNo || '--'}`,
        `时间: ${order.date} ${order.time}`,
        `上车点: ${order.pickup}`,
        `目的地: ${order.dest}`,
        `状态: ${order.statusText}`,
        `身份: ${roleLabel}`,
        order.price > 0 ? `费用: ¥${order.price}` : '',
      ].filter(Boolean).join('\n'),
      showCancel: false,
      confirmText: '关闭',
    });
  },
});

const STATUS_MAP: Record<string, { text: string; class: string }> = {
  pending: { text: '等待接单', class: 'status-pending' },
  accepted: { text: '已接单', class: 'status-accepted' },
  arrived: { text: '已到达', class: 'status-arrived' },
  running: { text: '行程中', class: 'status-running' },
  completed: { text: '已完成', class: 'status-completed' },
  cancelled: { text: '已取消', class: 'status-cancelled' },
};
