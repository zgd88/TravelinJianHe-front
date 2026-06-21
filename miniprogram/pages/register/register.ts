import { BASE_URL , request } from '../../utils/api';
// pages/register/register.ts
Page({
  data: {
    phone: '',
    password: '',
    password2: '',
    showPassword: false,
    showPassword2: false,
    loading: false,
    errorMsg: ''
  },

  onPhoneInput(e: any) {
    let value = e.detail.value.replace(/[^\d]/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    this.setData({ phone: value, errorMsg: '' });
  },

  onPasswordInput(e: any) {
    let value = e.detail.value.replace(/\s/g, '');
    if (value.length > 20) value = value.slice(0, 20);
    this.setData({ password: value, errorMsg: '' });
  },

  onPassword2Input(e: any) {
    let value = e.detail.value.replace(/\s/g, '');
    if (value.length > 20) value = value.slice(0, 20);
    this.setData({ password2: value, errorMsg: '' });
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },
  togglePassword2() {
    this.setData({ showPassword2: !this.data.showPassword2 });
  },

  validate(): boolean {
    const { phone, password, password2 } = this.data;

    if (!phone) {
      this.setData({ errorMsg: '请输入手机号码' });
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ errorMsg: '请输入正确的手机号码' });
      return false;
    }
    if (!password) {
      this.setData({ errorMsg: '请设置密码' });
      return false;
    }
    if (password.length < 6) {
      this.setData({ errorMsg: '密码长度不能少于6位' });
      return false;
    }
    // 强密码校验：必须包含数字和字母
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      this.setData({ errorMsg: '密码必须包含数字和字母' });
      return false;
    }
    if (password !== password2) {
      this.setData({ errorMsg: '两次输入的密码不一致' });
      return false;
    }
    return true;
  },

  handleRegister() {
    if (!this.validate()) return;

    this.setData({ loading: true, errorMsg: '' });

    const { phone, password } = this.data;

    request({
      url: BASE_URL + '/api/auth/register',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: { phone, password }
    }).then((res: any) => {
      console.log('注册响应:', res.data);
      if (res.data.code === 200) {
        wx.setStorageSync('token', res.data.data.token);
        wx.setStorageSync('userInfo', res.data.data);
        wx.showToast({ title: '注册成功', icon: 'success' });
        setTimeout(() => {
          // wx.redirectTo({ url: '/pages/index/index' }); 跳转到用户端
          wx.navigateTo({ url: '/pages/choose-role/choose-role' });
        }, 1000);
      } else {
        this.setData({ errorMsg: res.data.msg || '注册失败' });
      }
    }).catch(() => {
      this.setData({ errorMsg: '网络连接失败，请检查后端服务' });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  goLogin() {
    wx.navigateBack({ delta: 1 });
  }
});
