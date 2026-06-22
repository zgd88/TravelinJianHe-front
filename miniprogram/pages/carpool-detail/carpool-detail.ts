import api from '../../utils/api';
import { BASE_URL } from '../../utils/api';

Page({
  data: {
    carpool: null as any,
    loading: true,
  },

  onLoad(options: any) {
    if (options.id) {
      this.loadDetail(parseInt(options.id));
    }
  },

  loadDetail(id: number) {
    api({ url: BASE_URL + '/api/carpool/my-with-orders', showError: false }).then((res: any) => {
      if (res.code === 200) {
        const item = (res.data || []).find((c: any) => c.id === id);
        if (item) {
          const statusMap: Record<string, string> = { open: '进行中', closed: '已结束', cancelled: '已取消' };
          this.setData({
            carpool: {
              ...item,
              departTime: item.departTime ? item.departTime.slice(0, 16).replace('T', ' ') : '',
              statusText: statusMap[item.status] || item.displayStatus || '未知'
            },
            loading: false
          });
        } else {
          this.setData({ loading: false });
          wx.showToast({ title: '订单不存在', icon: 'none' });
        }
      }
    });
  },

  closeCarpool() {
    wx.showActionSheet({
      itemList: ['完成行程', '取消行程'],
      success: (actRes: any) => {
        const status = actRes.tapIndex === 0 ? 'closed' : 'cancelled';
        const msg = actRes.tapIndex === 0 ? '确定已完成行程？' : '确定取消行程？';
        wx.showModal({
          title: '确认操作',
          content: msg,
          success: (modalRes) => {
            if (modalRes.confirm) {
              api({ url: BASE_URL + '/api/carpool/close/' + this.data.carpool.id, method: 'POST', data: { status } }).then((res: any) => {
                if (res.code === 200) {
                  wx.showToast({ title: '操作成功', icon: 'success' });
                  setTimeout(() => wx.navigateBack({ delta: 1 }), 1000);
                }
              });
            }
          }
        });
      }
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
