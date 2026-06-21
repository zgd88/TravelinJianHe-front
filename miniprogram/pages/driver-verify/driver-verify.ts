import { BASE_URL } from '../../utils/api';
// pages/driver-verify/driver-verify.ts
Page({
  data: {
    // 表单
    realName: '',
    idCard: '',
    driverLicense: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleColor: '',
    idCardPhoto: '',
    driverLicensePhoto: '',

    // UI 状态
    loading: true,
    submitting: false,
    errorMsg: '',
    uploadingIdCard: false,
    uploadingLicense: false,

    // 认证状态
    verifyStatus: 'loading', // loading | none | pending | approved | rejected
    rejectReason: '',
    submittedData: null as any,

    // 是否显示表单
    showForm: true,
  },

  onLoad(options: any) {
    this.checkStatus();
  },

  // ========== 检查认证状态 ==========
  checkStatus() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ loading: false, verifyStatus: 'none', showForm: true });
      return;
    }

    wx.request({
      url: BASE_URL + '/api/verify/status',
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + token
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        const { status, reject_reason, verification } = res.data.data;

        if (status === 'none') {
          this.setData({ loading: false, verifyStatus: 'none', showForm: true });
        } else if (status === 'approved') {
          this.setData({ loading: false, verifyStatus: 'approved', showForm: false });
        } else if (status === 'pending') {
          this.setData({
            loading: false, verifyStatus: 'pending', showForm: false,
            submittedData: verification
          });
        } else if (status === 'rejected') {
          const fixUrl = (url: string) => url && url.startsWith('/uploads/') ? BASE_URL + url : url;
          this.setData({
            loading: false, verifyStatus: 'rejected', showForm: true,
            rejectReason: reject_reason || '审核未通过',
            realName: verification.real_name || '',
            idCard: verification.id_card || '',
            driverLicense: verification.driver_license || '',
            vehiclePlate: verification.vehicle_plate || '',
            vehicleModel: verification.vehicle_model || '',
            vehicleColor: verification.vehicle_color || '',
            idCardPhoto: fixUrl(verification.id_card_photo || ''),
            driverLicensePhoto: fixUrl(verification.driver_license_photo || ''),
          });
        }
      } else {
        this.setData({ loading: false, verifyStatus: 'none', showForm: true });
      }
    }).catch(() => {
      this.setData({ loading: false, verifyStatus: 'none', showForm: true });
    });
  },

  // ========== 输入处理 ==========
  onRealNameInput(e: any) { this.setData({ realName: e.detail.value }); },
  onIdCardInput(e: any) {
    let value = e.detail.value.replace(/[^\dXx]/g, '');
    if (value.length > 18) value = value.slice(0, 18);
    this.setData({ idCard: value.toUpperCase() });
  },
  onDriverLicenseInput(e: any) { this.setData({ driverLicense: e.detail.value }); },
  onVehiclePlateInput(e: any) {
    let value = e.detail.value.toUpperCase();
    if (value.length > 20) value = value.slice(0, 20);
    this.setData({ vehiclePlate: value });
  },
  onVehicleModelInput(e: any) { this.setData({ vehicleModel: e.detail.value }); },
  onVehicleColorInput(e: any) { this.setData({ vehicleColor: e.detail.value }); },

  // ========== 证件照上传 ==========
  chooseIdCardPhoto() {
    this.chooseAndUpload('idCardPhoto', 'uploadingIdCard');
  },
  chooseDriverLicensePhoto() {
    this.chooseAndUpload('driverLicensePhoto', 'uploadingLicense');
  },
  chooseAndUpload(field: string, loadingField: string) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        const tempFile: any = (res.tempFiles || [])[0];
        if (tempFile && tempFile.size > 10 * 1024 * 1024) {
          wx.showToast({ title: '图片不能超过10MB', icon: 'none' });
          return;
        }
        this.setData({ [loadingField]: true });

        const token = wx.getStorageSync('token');
        wx.uploadFile({
          url: BASE_URL + '/api/verify/upload',
          filePath: tempFilePath,
          name: 'file',
          header: { 'Authorization': 'Bearer ' + token },
          success: (uploadRes: any) => {
            try {
              const data = JSON.parse(uploadRes.data);
              if (data.code === 200) {
                this.setData({ [field]: BASE_URL + data.data.url, [loadingField]: false });
              } else {
                this.setData({ [loadingField]: false });
                wx.showToast({ title: data.msg || '上传失败', icon: 'none' });
              }
            } catch (e) {
              this.setData({ [loadingField]: false });
              wx.showToast({ title: '上传失败，请重试', icon: 'none' });
            }
          },
          fail: () => {
            this.setData({ [loadingField]: false });
            wx.showToast({ title: '上传失败，请重试', icon: 'none' });
          }
        });
      }
    });
  },

  // ========== 表单校验 ==========
  validate(): boolean {
    const { realName, idCard, driverLicense, vehiclePlate, vehicleModel, vehicleColor, idCardPhoto, driverLicensePhoto } = this.data;
    if (!realName.trim()) { this.setData({ errorMsg: '请输入真实姓名' }); return false; }
    if (!/^\d{17}[\dX]$/.test(idCard)) { this.setData({ errorMsg: '身份证号格式不正确（18位）' }); return false; }
    if (!driverLicense.trim()) { this.setData({ errorMsg: '请输入驾驶证号' }); return false; }
    if (!vehiclePlate.trim()) { this.setData({ errorMsg: '请输入车牌号' }); return false; }
    if (!vehicleModel.trim()) { this.setData({ errorMsg: '请输入车辆型号' }); return false; }
    if (!vehicleColor.trim()) { this.setData({ errorMsg: '请输入车辆颜色' }); return false; }
    if (!idCardPhoto) { this.setData({ errorMsg: '请上传身份证照片' }); return false; }
    if (!driverLicensePhoto) { this.setData({ errorMsg: '请上传驾驶证照片' }); return false; }
    return true;
  },

  // ========== 提交 ==========
  handleSubmit() {
    if (!this.validate()) return;

    this.setData({ submitting: true, errorMsg: '' });
    const token = wx.getStorageSync('token');

    wx.request({
      url: BASE_URL + '/api/verify/submit',
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        real_name: this.data.realName.trim(),
        id_card: this.data.idCard,
        driver_license: this.data.driverLicense.trim(),
        vehicle_plate: this.data.vehiclePlate.trim(),
        vehicle_model: this.data.vehicleModel.trim(),
        vehicle_color: this.data.vehicleColor.trim(),
        id_card_photo: this.data.idCardPhoto,
        driver_license_photo: this.data.driverLicensePhoto,
      }
    }).then((res: any) => {
      if (res.data.code === 200) {
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => this.checkStatus(), 1000);
      } else {
        this.setData({ errorMsg: res.data.msg || '提交失败' });
      }
    }).catch(() => {
      this.setData({ errorMsg: '网络连接失败' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },

  // ========== 导航 ==========
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  goHome() {
    wx.switchTab({ url: '/pages/driver-home/driver-home' });
  },
});
