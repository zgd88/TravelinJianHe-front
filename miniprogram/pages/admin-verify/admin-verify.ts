import { BASE_URL , request } from '../../utils/api';
// pages/admin-verify/admin-verify.ts
Page({
  data: {
    list: [] as any[],
    loading: true,
    // 详情弹窗
    showDetail: false,
    detailItem: null as any,
    // 驳回弹窗
    showReject: false,
    rejectId: 0,
    rejectReason: '',
    processing: false,
  },

  onLoad() {
    this.loadList();
  },

  loadList() {
    const token = wx.getStorageSync('token');
    if (!token) { this.setData({ loading: false }); return; }

    request({
      url: BASE_URL + '/api/verify/pending-list',
      method: 'GET',
    }).then((res: any) => {
      if (res.data.code === 200) {
        this.setData({ list: res.data.data || [] });
      }
    }).catch(() => {}).finally(() => {
      this.setData({ loading: false });
    });
  },

  // 查看详情
  showDetailPopup(e: any) {
    const item = e.currentTarget.dataset.item;
    this.setData({ showDetail: true, detailItem: item });
  },
  closeDetail() {
    this.setData({ showDetail: false, detailItem: null });
  },

  // 预览图片
  previewPhoto(e: any) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url] });
  },

  // 通过
  approve(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认通过',
      content: '通过后该用户将获得司机接单权限',
      confirmText: '确认通过',
      success: (modalRes) => {
        if (modalRes.confirm) this.doReview(id, 'approve');
      }
    });
  },

  // 驳回弹窗
  openReject(e: any) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showReject: true, rejectId: id, rejectReason: '' });
  },
  closeReject() {
    this.setData({ showReject: false, rejectId: 0, rejectReason: '' });
  },
  onRejectReasonInput(e: any) {
    this.setData({ rejectReason: e.detail.value });
  },
  submitReject() {
    if (!this.data.rejectReason.trim()) {
      wx.showToast({ title: '请填写驳回原因', icon: 'none' });
      return;
    }
    this.doReview(this.data.rejectId, 'reject', this.data.rejectReason);
  },

  doReview(id: number, action: string, reason?: string) {
    this.setData({ processing: true });
    const token = wx.getStorageSync('token');

    request({
      url: BASE_URL + '/api/verify/review',
      method: 'POST',
      data: { verification_id: id, action, reject_reason: reason || '' },
    }).then((res: any) => {
      if (res.data.code === 200) {
        wx.showToast({ title: res.data.msg, icon: 'success' });
        this.closeDetail();
        this.closeReject();
        this.loadList();
      } else {
        wx.showToast({ title: res.data.msg, icon: 'none' });
      }
    }).catch(() => {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }).finally(() => {
      this.setData({ processing: false });
    });
  },
});
