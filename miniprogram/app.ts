// app.ts
// 全局补丁: wx.request 返回 Promise + 自动带 Authorization（保留原有callback）
const _origRequest = wx.request;
(wx as any).request = (options: any) => {
  const token = wx.getStorageSync('token');
  if (token) {
    options.header = Object.assign({}, options.header, { 'Authorization': 'Bearer ' + token });
  }
  const origSuccess = options.success;
  const origFail = options.fail;
  return new Promise((resolve, reject) => {
    _origRequest.call(wx, Object.assign({}, options, {
      success: (res: any) => {
        if (origSuccess) origSuccess(res);
        resolve(res);
      },
      fail: (err: any) => {
        if (origFail) origFail(err);
        reject(err);
      }
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