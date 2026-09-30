const STATUS_TEXT = { pending: '审批中', approved: '已通过', rejected: '未通过', withdrawn: '已撤回' };

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = n => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: { item: null, loading: true, isApplicant: false },

  async onLoad(options) {
    this.itemId = options.id;
    if (options.role === 'applicant') {
      this.setData({ isApplicant: true });
    }
    await this.loadItem();
  },

  async loadItem() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('applies').doc(this.itemId).get();
      const item = res.data;
      item.statusText = STATUS_TEXT[item.status] || item.status;
      item.createTimeText = formatTime(item.createTime);
      item.approveTimeText = item.approveTime ? formatTime(item.approveTime) : '';
      this.setData({ item, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  onCopyLink() {
    wx.setClipboardData({
      data: this.data.item.link,
      success: () => wx.showToast({ title: '链接已复制' }),
    });
  },

  onWithdraw() {
    wx.showModal({
      title: '确认撤回这条申请？',
      content: '撤回后审批人将无法再处理这条申请，此操作不可恢复',
      confirmColor: '#ff4d6d',
      success: async res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '撤回中' });
        try {
          const cbRes = await wx.cloud.callFunction({ name: 'withdrawApply', data: { id: this.itemId } });
          wx.hideLoading();
          if (cbRes.result && cbRes.result.success) {
            wx.showToast({ title: '已撤回' });
            this.loadItem();
          } else {
            wx.showToast({ title: (cbRes.result && cbRes.result.message) || '撤回失败', icon: 'none' });
          }
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '撤回失败，请重试', icon: 'none' });
        }
      },
    });
  },

  onEdit() {
    getApp().globalData.editApplyId = this.itemId;
    wx.switchTab({ url: '/pages/apply/apply' });
  },

  onShareAppMessage() {
    const item = this.data.item;
    return {
      title: item ? `有一笔购买申请待你审批：${item.title}` : '购买申请审批小程序',
      path: `/pages/approve/approve?id=${this.itemId}`,
    };
  },
});
