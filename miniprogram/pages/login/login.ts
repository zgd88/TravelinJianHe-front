import { BASE_URL , request } from '../../utils/api';
// pages/login/login.ts
Page({
  data: {
    phone: '',
    password: '',
    showPassword: false,
    loading: false,
    errorMsg: '',
    phoneFocused: false,
    passwordFocused: false
  },

  onPhoneInput(e: any) {
    let value = e.detail.value;
    value = value.replace(/[^\d]/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    this.setData({ phone: value, errorMsg: '' });
  },
  onPhoneFocus() { this.setData({ phoneFocused: true }); },
  onPhoneBlur() { this.setData({ phoneFocused: false }); },
  clearPhone() { this.setData({ phone: '', errorMsg: '' }); },

  onPasswordInput(e: any) {
    let value = e.detail.value;
    value = value.replace(/\s/g, '');
    if (value.length > 20) value = value.slice(0, 20);
    value = value.replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, '');
    this.setData({ password: value, errorMsg: '' });
  },
  onPasswordFocus() { this.setData({ passwordFocused: true }); },
  onPasswordBlur() { this.setData({ passwordFocused: false }); },
  togglePassword() { this.setData({ showPassword: !this.data.showPassword }); },

  validate(): boolean {
    const { phone, password } = this.data;
    if (!phone) { this.setData({ errorMsg: '请输入手机号码' }); return false; }
    if (phone.length < 11) { this.setData({ errorMsg: '手机号码为11位，请检查' }); return false; }
    if (!/^1[3-9]\d{9}$/.test(phone)) { this.setData({ errorMsg: '请输入正确的手机号码' }); return false; }
    if (!password) { this.setData({ errorMsg: '请输入密码' }); return false; }
    if (password.length < 6) { this.setData({ errorMsg: '密码长度不能少于6位' }); return false; }
    return true;
  },

  handleLogin() {
    if (!this.validate()) return;
    this.setData({ loading: true, errorMsg: '' });
    const { phone, password } = this.data;

    request({
      url: BASE_URL + '/api/auth/login',
      method: 'POST',
      data: { phone, password },
      success: (res: any) => {
        this.setData({ loading: false });
        if (res.statusCode !== 200 || !res.data) {
          const tips: Record<number, string> = { 502: '服务器维护中，请稍后再试', 503: '服务器繁忙，请稍后再试', 500: '服务器内部错误，请稍后再试', 404: '服务未找到，请联系管理员' };
          this.setData({ errorMsg: tips[res.statusCode] || `服务异常(${res.statusCode})，请稍后再试` });
          return;
        }
        if (res.data.code === 200) {
          wx.setStorageSync('token', res.data.data.token);
          wx.setStorageSync('userInfo', res.data.data);
          wx.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/choose-role/choose-role' });
          }, 1000);
        } else if (res.data.code === 429) {
          this.setData({ errorMsg: '操作太频繁，请稍后再试' });
        } else {
          this.setData({ errorMsg: res.data.msg || '手机号或密码错误' });
        }
      },
      fail: (err: any) => {
        console.error('登录请求失败:', err);
        this.setData({ loading: false, errorMsg: '网络连接失败，请检查网络后重试' });
      }
    });
  },

  goRegister() { wx.navigateTo({ url: '/pages/register/register' }); },
  skipLogin() { wx.reLaunch({ url: '/pages/index/index' }); },
  goForgot() { wx.navigateTo({ url: '/pages/reset-password/reset-password' }); },
});
