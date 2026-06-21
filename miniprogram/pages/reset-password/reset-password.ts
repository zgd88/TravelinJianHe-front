import { BASE_URL , request } from '../../utils/api';
// pages/reset-password/reset-password.ts
Page({
  data: {
    phone: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    loading: false,
    errorMsg: '',
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

  onConfirmPasswordInput(e: any) {
    let value = e.detail.value.replace(/\s/g, '');
    if (value.length > 20) value = value.slice(0, 20);
    this.setData({ confirmPassword: value, errorMsg: '' });
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  validate(): boolean {
    const { phone, password, confirmPassword } = this.data;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ errorMsg: '请输入正确的11位手机号' }); return false;
    }
    if (password.length < 6) {
      this.setData({ errorMsg: '新密码至少6位' }); return false;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      this.setData({ errorMsg: '密码必须包含数字和字母' }); return false;
    }
    if (password !== confirmPassword) {
      this.setData({ errorMsg: '两次输入的密码不一致' }); return false;
    }
    return true;
  },

  handleSubmit() {
    if (!this.validate()) return;

    this.setData({ loading: true, errorMsg: '' });

    request({
      url: BASE_URL + '/api/auth/reset-password',
      method: 'POST',
      data: { phone: this.data.phone, password: this.data.password }
    }).then((res: any) => {
      this.setData({ loading: false });
      if (res.statusCode !== 200 || !res.data) {
        const tips: Record<number, string> = { 502: '服务器维护中，请稍后再试', 503: '服务器繁忙，请稍后再试', 500: '服务器内部错误，请稍后再试' };
        this.setData({ errorMsg: tips[res.statusCode] || `服务异常(${res.statusCode})，请稍后再试` });
        return;
      }
      if (res.data.code === 200) {
        wx.showModal({
          title: '密码重置成功',
          content: '请使用新密码重新登录',
          showCancel: false,
          success: () => wx.navigateBack({ delta: 1 })
        });
      } else {
        this.setData({ errorMsg: res.data.msg || '重置失败' });
      }
    }).catch(() => {
      this.setData({ loading: false, errorMsg: '网络连接失败，请检查网络后重试' });
    });
  },
});
