import { BASE_URL } from '../../utils/api';
// pages/driver-detail/driver-detail.ts
Page({
  data: {
    orderId: 0,
    orderNo: '',
    loading: true,
    // 聊天
    messages: [] as any[],
    chatText: '',
    showChat: false,
    unreadCount: 0,
    // 乘客信息
    passengerName: '乘客',
    passengerPhone: '',
    passengerPhoneMasked: '暂无手机号',
    passengerAvatar: '',
    // 路线
    pickupAddr: '上车点',
    destAddr: '目的地',
    // 费用
    price: '0',
    estimatedDistance: '--',
    // 状态
    status: 'accepted',
    statusText: '',
    statusIcon: '',
    statusColor: '',
    // 地图
    latitude: 30.6598,
    longitude: 104.0634,
    scale: 14,
    markers: [] as any[],
    polyline: [] as any[],
    // WebSocket
    socketReady: false,
    // 按钮状态
    canArrive: false,
    canStart: false,
    canComplete: false,
    actionsVisible: true,
  },

  socketTask: null as any,
  locationTimer: null as any,

  onLoad(options: any) {
    if (options.orderId) {
      this.setData({ orderId: parseInt(options.orderId) });
      this.loadOrderDetail();
      this.connectWebSocket();
    }
  },

  onUnload() {
    this.cleanup();
  },

  cleanup() {
    if (this.locationTimer) clearInterval(this.locationTimer);
    if (this.socketTask) {
      this.socketTask.close({ code: 1000, reason: '页面关闭' });
    }
  },

  // ========== 加载订单详情 ==========
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
        const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.accepted;

        this.setData({
          loading: false,
          orderNo: order.order_no || '',
          pickupAddr: order.pickup_addr || '上车点',
          destAddr: order.dest_addr || '目的地',
          price: String(order.price || 0),
          status: order.status,
          statusText: statusInfo.text,
          statusIcon: statusInfo.icon,
          statusColor: statusInfo.color,
          passengerName: order.passenger_name || '乘客',
          passengerPhone: order.passenger_phone || '',
          passengerPhoneMasked: order.passenger_phone_masked || '暂无手机号',
          passengerAvatar: order.passenger_avatar || '',
          canArrive: order.status === 'accepted',
          canStart: order.status === 'arrived',
          canComplete: order.status === 'running',
          actionsVisible: ['accepted', 'arrived', 'running'].includes(order.status),
          estimatedDistance: this.calcDistance(order),
        });

        this.updateMapMarkers(order);
        this.fitMapViewport(order);
      }
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  // 计算估算距离
  calcDistance(order: any): string {
    const lat1 = order.pickup_lat;
    const lng1 = order.pickup_lng;
    const lat2 = order.dest_lat;
    const lng2 = order.dest_lng;
    if (!lat1 || !lng1 || !lat2 || !lng2) return '--';
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1) + ' km';
  },

  // 更新地图标记
  updateMapMarkers(order: any) {
    const pickupLat = order.pickup_lat || 30.6598;
    const pickupLng = order.pickup_lng || 104.0634;
    const destLat = order.dest_lat || 30.5754;
    const destLng = order.dest_lng || 104.0654;

    const markers: any[] = [
      {
        id: 1,
        latitude: pickupLat,
        longitude: pickupLng,
        width: 36,
        height: 36,
        iconPath: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxOCIgY3k9IjE4IiByPSIxNCIgZmlsbD0iIzA3YzE2MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48dGV4dCB4PSIxOCIgeT0iMjMiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmYiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSJib2xkIj7wn5CDPC90ZXh0Pjwvc3ZnPg==',
        callout: { content: '上车点', fontSize: 11, padding: 6, display: 'ALWAYS', borderRadius: 6 }
      },
      {
        id: 2,
        latitude: destLat,
        longitude: destLng,
        width: 36,
        height: 36,
        iconPath: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxOCIgY3k9IjE4IiByPSIxNCIgZmlsbD0iI2ZmNmIwMCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48dGV4dCB4PSIxOCIgeT0iMjMiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmYiIGZvbnQtc2l6ZT0iMTYiPvCfjLE8L3RleHQ+PC9zdmc+',
        callout: { content: '目的地', fontSize: 11, padding: 6, display: 'ALWAYS', borderRadius: 6 }
      }
    ];

    const polyline: any[] = [{
      points: [
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: destLat, longitude: destLng }
      ],
      color: '#ff6b00',
      width: 5,
      dottedLine: true,
      arrowLine: true
    }];

    this.setData({ latitude: pickupLat, longitude: pickupLng, markers, polyline });
  },

  // 自动适配地图视野
  fitMapViewport(order: any) {
    const pickupLat = order.pickup_lat || 30.6598;
    const pickupLng = order.pickup_lng || 104.0634;
    const destLat = order.dest_lat || 30.5754;
    const destLng = order.dest_lng || 104.0654;

    const mapCtx = wx.createMapContext('driverMap', this);
    mapCtx.includePoints({
      points: [
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: destLat, longitude: destLng }
      ],
      padding: [80, 40, 80, 40]
    });
  },

  // ========== WebSocket ==========
  async connectWebSocket() {
    try {
      const socketTask = wx.connectSocket({
        url: 'wss://zzggdd.com/ws?role=driver&orderId=' + this.data.orderId
      });

      this.socketTask = socketTask;

      socketTask.onOpen(() => {
        console.log('司机 WebSocket 已连接');
        this.setData({ socketReady: true });
        this.startReportLocation();
      });

      socketTask.onMessage((res: any) => {
        const data = JSON.parse(res.data);
        if (data.type === 'message') {
          const msg = { text: data.text, from: data.from, time: this.now() };
          const messages = [...this.data.messages, msg];
          this.setData({
            messages,
            unreadCount: this.data.showChat ? this.data.unreadCount : this.data.unreadCount + 1,
          });
        }
      });

      socketTask.onClose(() => {
        this.setData({ socketReady: false });
      });

      socketTask.onError((err: any) => {
        console.error('司机 WebSocket 错误:', err);
      });
    } catch (err) {
      console.error('司机 WebSocket 连接失败:', err);
    }
  },

  startReportLocation() {
    if (this.locationTimer) clearInterval(this.locationTimer);

    this.locationTimer = setInterval(() => {
      if (!this.data.socketReady) return;

      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          if (this.socketTask) {
            this.socketTask.send({
              data: JSON.stringify({ type: 'location', lat: res.latitude, lng: res.longitude }),
              success: () => {},
              fail: (err: any) => console.error('位置上报失败:', err)
            });
          }
        },
        fail: () => {}
      });
    }, 3000);
  },

  // ========== 一键导航 ==========
  navigateToPickup() {
    const { latitude, longitude, pickupAddr } = this.data;
    wx.openLocation({
      latitude,
      longitude,
      name: pickupAddr,
      address: pickupAddr,
      scale: 16
    });
  },

  // ========== 聊天 ==========
  toggleChat() {
    this.setData({ showChat: !this.data.showChat, unreadCount: 0 });
  },
  onChatInput(e: any) {
    this.setData({ chatText: e.detail.value });
  },
  sendMessage() {
    const text = this.data.chatText.trim();
    if (!text || !this.socketTask) return;

    const msg = { text, from: 'driver', time: this.now() };
    this.setData({
      messages: [...this.data.messages, msg],
      chatText: '',
    });

    this.socketTask.send({
      data: JSON.stringify({ type: 'message', text, from: 'driver' })
    });
  },
  now() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  },

  // ========== 联系乘客 ==========
  callPassenger() {
    if (!this.data.passengerPhone) {
      wx.showToast({ title: '暂无乘客手机号', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '联系乘客',
      content: '拨打 ' + this.data.passengerPhoneMasked + '？',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) wx.makePhoneCall({ phoneNumber: this.data.passengerPhone });
      }
    });
  },

  // ========== 状态操作 ==========
  arrivePickup() {
    wx.showModal({
      title: '确认到达',
      content: '已到达上车点，确认后通知乘客？',
      success: (res) => { if (res.confirm) this.updateOrderStatus('arrive'); }
    });
  },

  startTrip() {
    wx.showModal({
      title: '开始行程',
      content: '确认乘客已上车，开始计费？',
      success: (res) => { if (res.confirm) this.updateOrderStatus('start'); }
    });
  },

  completeTrip() {
    wx.showModal({
      title: '完成行程',
      content: '确认已到达目的地，结束行程？',
      success: (res) => { if (res.confirm) this.updateOrderStatus('complete'); }
    });
  },

  updateOrderStatus(action: string) {
    const token = wx.getStorageSync('token');
    wx.request({
      url: BASE_URL + '/api/order/' + action + '/' + this.data.orderId,
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        wx.showToast({ title: res.data.msg, icon: 'success' });

        // 通过 WebSocket 通知乘客状态变更
        if (this.socketTask && this.data.socketReady) {
          const price = (res.data.data && res.data.data.price);
          this.socketTask.send({
            data: JSON.stringify({
              type: 'status_change',
              status: action === 'arrive' ? 'arrived' : action === 'start' ? 'running' : 'completed',
              price: price || 0
            })
          });
        }

        if (action === 'complete') {
          this.cleanup();
          const price = (res.data.data && res.data.data.price) || this.data.price;
          wx.showModal({
            title: '🎉 行程完成',
            content: '本次收入 ¥' + price,
            showCancel: false,
            success: () => wx.switchTab({ url: '/pages/driver-home/driver-home' })
          });
        } else {
          this.loadOrderDetail();
        }
      } else {
        wx.showToast({ title: res.data.msg, icon: 'none' });
      }
    }).catch(() => {
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },
});

// 状态配置
const STATUS_CONFIG: Record<string, { text: string; icon: string; color: string }> = {
  accepted: { text: '请前往上车点接乘客', icon: '🚗', color: '#1976d2' },
  arrived: { text: '已到达上车点，等待乘客上车', icon: '📍', color: '#ff8c00' },
  running: { text: '行程进行中，请安全驾驶', icon: '🏃', color: '#07c160' },
  completed: { text: '行程已完成', icon: '✅', color: '#07c160' },
  cancelled: { text: '订单已取消', icon: '❌', color: '#f44336' },
};
