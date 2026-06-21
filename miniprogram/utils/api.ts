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
  // wx.request 已被 app.ts monkey-patch 为返回 Promise 且自动带 Authorization
  const p: any = wx.request({
    url: BASE_URL + path,
    method: options.method || 'GET',
    data: options.data,
    header: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (token || '')
    }
  });

  return p.then((res: any) => {
    if (res.data.code !== 200 && options.showError !== false) {
      wx.showToast({ title: res.data.msg || '操作失败', icon: 'none', duration: 2000 });
    }
    return res.data;
  }).catch(() => {
    if (options.showError !== false) {
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 2000 });
    }
    return { code: -1, data: null, msg: '网络异常' };
  });
}

export default api;
export { BASE_URL };
