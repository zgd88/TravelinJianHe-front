// app.ts
// 全局补丁: wx.request 返回 Promise
const _origRequest = wx.request;
(wx as any).request = (options: any) => {
  return new Promise((resolve, reject) => {
    _origRequest.call(wx, Object.assign({}, options, {
      success: (res: any) => resolve(res),
      fail: (err: any) => reject(err)
    }));
  });
};

App<IAppOption>({
  globalData: {},
  onLaunch() {
    wx.cloud.init({
      env: 'prod-d9gwk85xd3e015347'
    })

    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    wx.login({
      success: res => {
        console.log(res.code)
      },
    })
  },
})