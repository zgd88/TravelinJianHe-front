import { BASE_URL } from '../../utils/api';
// pages/wallet/wallet.ts
import api from '../../utils/api';

Page({
  data: {
    balance: '0',
    role: '',
    recentTransactions: [] as any[],
    loading: true,
  },

  onShow() {
    const role = wx.getStorageSync('role') || 'passenger';
    this.setData({ role });
    this.loadData();
  },

  loadData() {
    api({ url: BASE_URL + '/api/order/my-orders', showError: false }).then((res: any) => {
      if (res.code === 200) {
        const orders = res.data || [];
        const role = this.data.role;
        const userId = parseInt((wx.getStorageSync('userInfo') || {}).userId || '0');

        // 计算余额（司机收入 - 乘客支出）
        let balance = 0;
        const transactions: any[] = [];

        orders.forEach((o: any) => {
          if (o.status === 'completed' && o.price > 0) {
            if (o.driver_id && String(o.driver_id) === String(userId)) {
              balance += parseFloat(o.price);
              transactions.push({
                type: '收入', amount: '+' + o.price, date: (o.created_at || '').slice(0, 10),
                desc: '订单收入', color: 'green',
              });
            } else if (o.user_id && String(o.user_id) === String(userId)) {
              balance -= parseFloat(o.price);
              transactions.push({
                type: '支出', amount: '-' + o.price, date: (o.created_at || '').slice(0, 10),
                desc: '打车支出', color: 'red',
              });
            }
          }
        });

        this.setData({
          balance: balance.toFixed(2),
          recentTransactions: transactions.slice(0, 20),
          loading: false,
        });
      } else {
        this.setData({ loading: false });
      }
    });
  },

  goTopUp() {
    wx.showToast({ title: '充值功能开发中', icon: 'none' });
  },
});
