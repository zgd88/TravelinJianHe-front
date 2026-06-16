import { BASE_URL } from '../../utils/api';
// pages/earnings/earnings.ts
import api from '../../utils/api';

Page({
  data: {
    daily: [] as any[],
    totalIncome: '0',
    totalTrips: 0,
    loading: true,
  },

  onLoad() {
    this.loadWeekly();
  },

  loadWeekly() {
    api({ url: BASE_URL + '/api/order/driver-weekly', showError: false }).then((res: any) => {
      if (res.code === 200) {
        const daily = res.data || [];
        const totalIncome = daily.reduce((s: number, d: any) => s + d.income, 0);
        const totalTrips = daily.reduce((s: number, d: any) => s + d.trips, 0);
        this.setData({
          daily, loading: false,
          totalIncome: totalIncome.toFixed(2),
          totalTrips,
        });
      } else {
        this.setData({ loading: false });
      }
    });
  },
});
