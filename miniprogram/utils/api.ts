// 统一 HTTP 请求
const BASE_URL = 'https://zzggdd.com';

// 底层请求函数，替代 wx.request，返回真实 Promise + 自动注入 Authorization + 保留 callback + 永不reject
function request(options: any): Promise<any> {
  const token = wx.getStorageSync('token') || '';
  const merged = Object.assign({}, options);
  merged.header = Object.assign({}, { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || '') }, options.header);
  return new Promise((resolve) => {
    const origSuccess = merged.success;
    const origFail = merged.fail;
    merged.success = (res: any) => {
      if (origSuccess) origSuccess(res);
      resolve(res);
    };
    merged.fail = (err: any) => {
      console.error('request fail:', err);
      if (origFail) origFail(err);
      resolve({ statusCode: 0, data: { code: -1, msg: '网络异常' } });
    };
    wx.request(merged);
  });
}

// 便捷封装: 自动处理错误 toast + 直接返回 res.data
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

  return request({
    url: BASE_URL + path,
    method: options.method || 'GET',
    data: options.data
  }).then((res: any) => {
    if (res.data && res.data.code !== 200 && options.showError !== false) {
      wx.showToast({ title: res.data.msg || '操作失败', icon: 'none', duration: 2000 });
    }
    return res.data || { code: -1, msg: '网络异常' };
  }).catch(() => {
    if (options.showError !== false) {
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 2000 });
    }
    return { code: -1, data: null, msg: '网络异常' };
  });
}

export default api;
export { BASE_URL, request };
