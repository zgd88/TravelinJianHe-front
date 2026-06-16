Component({
  data: {
    selected: 0,
    list: []
  },
  lifetimes: {
    attached() {
      this.refreshList();
    },
    pageLifetimes: {
      show() {
        this.refreshList();
      }
    }
  },
  methods: {
    refreshList() {
      const role = wx.getStorageSync('role');
      if (role === 'driver') {
        this.setData({
          list: [
            { pagePath: '/pages/driver-home/driver-home', text: '接单' },
            { pagePath: '/pages/mine/mine', text: '我的' }
          ]
        });
      } else {
        this.setData({
          list: [
            { pagePath: '/pages/index/index', text: '首页' },
            { pagePath: '/pages/mine/mine', text: '我的' }
          ]
        });
      }
    },
    switchTab(e: any) {
      const index = e.currentTarget.dataset.index;
      const path = this.data.list[index].pagePath;
      wx.switchTab({ url: path });
    }
  }
});
