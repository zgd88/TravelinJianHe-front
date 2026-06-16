import { BASE_URL } from '../../utils/api';
// pages/riding/riding.ts
Page({
  data: {
    latitude: 30.6598,
    longitude: 104.0634,
    scale: 15,
    markers: [] as any[],
    polyline: [] as any[],
    orderId: 0,
    loading: true,
    // 聊天
    messages: [] as any[],
    chatText: '',
    showChat: false,
    unreadCount: 0,
    // 司机信息（从后端获取）
    driverName: '',
    driverPhone: '',
    driverPhoneMasked: '',
    carPlate: '',
    carModel: '',
    carColor: '',
    // 订单信息
    destination: '',
    price: '0',
    statusText: '正在获取行程信息...',
  },

  socketTask: null as any,

  onLoad(options: any) {
    if (options.orderId) {
      this.setData({ orderId: parseInt(options.orderId) });
    }
    if (options.destination) {
      this.setData({ destination: decodeURIComponent(options.destination) });
    }
    this.loadOrderDetail();
    this.connectWebSocket();
  },

  onUnload() {
    this.cleanup();
  },
  onHide() {
    this.cleanup();
  },

  cleanup() {
    if (this.socketTask) {
      try { this.socketTask.close({ code: 1000, reason: '页面关闭' }); } catch (e) {}
      this.socketTask = null;
    }
  },

  // ========== 加载真实订单数据 ==========
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

        // 司机信息
        const driverName = order.driver_name || '司机';
        const driverPhone = order.driver_phone || '';
        const driverPhoneMasked = order.driver_phone_masked || '';
        const carPlate = order.vehicle_plate || '--';
        const carModel = order.vehicle_model || '--';
        const carColor = order.vehicle_color || '--';

        // 价格：后端已计算 或 用坐标估算
        const price = order.price > 0
          ? String(order.price)
          : this.estimateFare(order.pickup_lat, order.pickup_lng, order.dest_lat, order.dest_lng);
        const destination = order.dest_addr || this.data.destination;

        this.setData({
          loading: false,
          driverName,
          driverPhone,
          driverPhoneMasked,
          carPlate,
          carModel,
          carColor,
          price,
          destination,
          statusText: '司机正在赶来',
        });

        // 用真实坐标更新地图
        this.updateMapFromOrder(order);
      } else {
        this.setData({ loading: false, statusText: '获取订单信息失败' });
      }
    }).catch(() => {
      this.setData({ loading: false, statusText: '网络异常' });
    });
  },

  // 估算费用（后端未计价时 fallback）
  estimateFare(lat1: number, lng1: number, lat2: number, lng2: number): string {
    if (!lat1 || !lng1 || !lat2 || !lng2) return '25';
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const fare = dist <= 3 ? 8 : 8 + (dist - 3) * 2;
    return String(Math.round(fare));
  },

  // ========== 地图标记 ==========
  updateMapFromOrder(order: any) {
    const pickupLat = order.pickup_lat || 30.6598;
    const pickupLng = order.pickup_lng || 104.0634;
    const destLat = order.dest_lat || 30.5754;
    const destLng = order.dest_lng || 104.0654;

    const markers: any[] = [
      {
        id: 1, latitude: pickupLat, longitude: pickupLng,
        width: 30, height: 30,
        callout: { content: '上车点', fontSize: 12, padding: 6, display: 'ALWAYS' }
      },
      {
        id: 2, latitude: destLat, longitude: destLng,
        width: 30, height: 30,
        callout: { content: '目的地', fontSize: 12, padding: 6, display: 'ALWAYS' }
      }
    ];

    const polyline: any[] = [{
      points: [
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: destLat, longitude: destLng }
      ],
      color: '#ff6b00', width: 6, dottedLine: false, arrowLine: true
    }];

    this.setData({
      latitude: pickupLat, longitude: pickupLng,
      markers, polyline
    });
  },

  // ========== WebSocket ==========
  async connectWebSocket() {
    try {
      const socketTask = wx.connectSocket({
        url: 'wss://zzggdd.com/ws?role=passenger&orderId=' + this.data.orderId
      });

      this.socketTask = socketTask;

      socketTask.onOpen(() => {
        console.log('乘客 WebSocket 已连接');
      });

      socketTask.onMessage((res: any) => {
        const data = JSON.parse(res.data);
        if (data.type === 'driver_location') {
          this.updateDriverMarker(data.lat, data.lng);
        } else if (data.type === 'status_change') {
          this.handleStatusChange(data.status, data.price);
        } else if (data.type === 'message') {
          const msg = { text: data.text, from: data.from, time: this.now() };
          const messages = [...this.data.messages, msg];
          this.setData({
            messages,
            unreadCount: this.data.showChat ? this.data.unreadCount : this.data.unreadCount + 1,
          });
        }
      });

      socketTask.onClose(() => {
        console.log('乘客 WebSocket 断开');
      });

      socketTask.onError((err: any) => {
        console.error('乘客 WebSocket 错误:', err);
      });
    } catch (err) {
      console.error('乘客 WebSocket 连接失败:', err);
    }
  },

  // 更新司机位置标记
  // WebSocket 收到状态变更
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

    const msg = { text, from: 'passenger', time: this.now() };
    this.setData({
      messages: [...this.data.messages, msg],
      chatText: '',
    });

    this.socketTask.send({
      data: JSON.stringify({ type: 'message', text, from: 'passenger' })
    });
  },
  now() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  },

  handleStatusChange(status: string, price: number) {
    const statusMap: Record<string, string> = {
      arrived: '司机已到达上车点',
      running: '行程进行中',
      completed: '行程已完成',
    };
    const text = statusMap[status] || status;
    this.setData({ statusText: text });

    if (status === 'completed') {
      this.cleanup();
      wx.redirectTo({ url: '/pages/finish/finish?orderId=' + this.data.orderId });
    }
  },

  updateDriverMarker(lat: number, lng: number) {
    const baseMarkers = (this.data.markers || []).filter((m: any) => m.id === 1 || m.id === 2);

    baseMarkers.push({
      id: 99,
      latitude: lat,
      longitude: lng,
      width: 36, height: 36,
      iconPath: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxOCIgY3k9IjE4IiByPSIxNiIgZmlsbD0iIzE5NzZkMiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48L3N2Zz4=',
      callout: {
        content: '司机', fontSize: 13, padding: 8,
        borderRadius: 8, bgColor: '#1976d2', color: '#ffffff', display: 'ALWAYS'
      }
    });

    this.setData({ markers: baseMarkers });
    this.setData({ statusText: '司机正在赶来' });
  },

  // ========== 操作 ==========
  callDriver() {
    if (!this.data.driverPhone) {
      wx.showToast({ title: '暂无司机手机号', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '联系司机',
      content: '拨打 ' + (this.data.driverPhoneMasked || this.data.driverPhone) + '？',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) wx.makePhoneCall({ phoneNumber: this.data.driverPhone });
      }
    });
  },

  cancelTrip() {
    wx.showActionSheet({
      itemList: ['司机服务态度差', '行程有变动', '车辆信息不符', '其他原因'],
      success: (res) => {
        const reasons = ['司机服务态度差', '行程有变动', '车辆信息不符', '其他原因'];
        const reason = reasons[res.tapIndex];
        wx.showModal({
          title: '确认取消',
          content: '取消原因：' + reason + '\n取消可能会产生费用',
          confirmText: '确认取消',
          confirmColor: '#ff4d4f',
          success: (modalRes) => {
            if (modalRes.confirm) this.doCancel(reason);
          }
        });
      }
    });
  },

  doCancel(reason: string) {
    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + '/api/order/cancel/' + this.data.orderId,
      method: 'POST',
      data: { reason },
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then(() => {
      this.cleanup();
      wx.showToast({ title: '订单已取消', icon: 'success' });
      setTimeout(() => wx.redirectTo({ url: '/pages/index/index' }), 1000);
    }).catch(() => {
      this.cleanup();
      wx.showToast({ title: '订单已取消', icon: 'success' });
      setTimeout(() => wx.redirectTo({ url: '/pages/index/index' }), 1000);
    });
  },

  arriveDest() {
    wx.showModal({
      title: '确认到达',
      content: '是否确认到达目的地？',
      confirmText: '确认',
      success: (res) => {
        if (res.confirm) {
          wx.redirectTo({ url: '/pages/finish/finish?orderId=' + this.data.orderId });
        }
      }
    });
  }
});
