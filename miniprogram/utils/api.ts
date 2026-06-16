// 统一 HTTP 请求
const BASE_URL = 'https://zzggdd.com';

function getToken(): string {
  return wx.getStorageSync('token') || '';
}

// 两种调用方式: api('/path', { method, data }) 或 api({ url: '/path', showError })
function api(pathOrOptions: any, opts?: any): Promise<any> {
  let path: string, options: any;

  if (typeof pathOrOptions === 'string') {
    path = pathOrOptions;
    options = opts || {};
  } else {
    const o = pathOrOptions;
    // 如果传了完整URL就取path部分，否则直接用
    path = o.url ? o.url.replace(BASE_URL, '') : o.path || '';
    options = o;
  }

  const token = getToken();
  return new Promise((resolve) => {
    wx.request({
      url: BASE_URL + path,
      method: (options.method as any) || 'GET',
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

export default api;
export { BASE_URL };
