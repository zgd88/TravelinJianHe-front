// 统一 HTTP 请求
const BASE_URL = 'https://zzggdd.com';

// 两种调用方式: api('/path', { method, data }) 或 api({ url: '/path', showError })
function api(pathOrOptions: any, opts?: any): Promise<any> {
  let path: string, options: any;

  if (typeof pathOrOptions === 'string') {
    path = pathOrOptions;
    options = opts || {};
  } else {
    const o = pathOrOptions;
    path = o.url ? o.url.replace(BASE_URL, '') : o.path || '';
    options = o;
  }

  const token = wx.getStorageSync('token') || '';
  return new Promise((resolve) => {
    wx.request({
      url: BASE_URL + path,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (token || '')
      },
      success: (res: any) => {
        if (res.data.code !== 200 && options.showError !== false) {
          wx.showToast({ title: res.data.msg || '操作失败', icon: 'none', duration: 2000 });
        }
        resolve(res.data);
      },
      fail: () => {
        if (options.showError !== false) {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 2000 });
        }
        resolve({ code: -1, data: null, msg: '网络异常' });
      }
    });
  });
}

// 直接替代 wx.request，返回真实 Promise，自动注入 Authorization
function request(options: any): Promise<any> {
  const token = wx.getStorageSync('token') || '';
  const merged = Object.assign({}, options);
  merged.header = Object.assign({}, { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || '') }, options.header);
  return new Promise((resolve, reject) => {
    const origSuccess = merged.success;
    const origFail = merged.fail;
    merged.success = (res: any) => {
      if (origSuccess) origSuccess(res);
      resolve(res);
    };
    merged.fail = (err: any) => {
      if (origFail) origFail(err);
      reject(err);
    };
    wx.request(merged);
  });
}

export default api;
export { BASE_URL, request };
