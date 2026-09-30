// 订阅消息模板 ID：公共模板库"待办事项提醒"，有新申请时通知审批人
const NEW_APPLY_TEMPLATE_ID = require('../../config').newApplyTemplateId;

Page({
  data: { list: [], filteredList: [], focusId: '', activeFilter: 'pending' },

  onLoad(options) {
    if (options.id) {
      this.setData({ focusId: options.id });
    }
  },

  onShow() {
    this.loadList();
    // 每次打开"待我审批"页，都请求一次订阅授权，
    // 这样以后有人提交新申请时才能推送通知给我
    wx.requestSubscribeMessage({ tmplIds: [NEW_APPLY_TEMPLATE_ID] }).catch(err => {
      console.warn('订阅新申请通知授权失败或被拒绝', err);
    });
  },

  async loadList() {
    const res = await wx.cloud.callFunction({ name: 'getApplies', data: { role: 'approver' } });
    let list = (res.result && res.result.data) || [];

    list = list.map(item => ({
      ...item,
      approveTimeText: item.approveTime ? this.formatTime(item.approveTime) : '',
    }));

    // 如果是从分享链接进来的，把对应那条置顶，方便一眼看到
    if (this.data.focusId) {
      const idx = list.findIndex(item => item._id === this.data.focusId);
      if (idx > 0) {
        const [target] = list.splice(idx, 1);
        list.unshift(target);
      }
    }

    this.setData({ list }, () => {
      this.applyFilter();
    });
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ activeFilter: filter }, () => {
      this.applyFilter();
    });
  },

  applyFilter() {
    const { list, activeFilter } = this.data;
    const filteredList = list.filter(item => item.status === activeFilter);
    this.setData({ filteredList });
  },

  formatTime(ts) {
    const d = new Date(ts);
    const pad = n => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  onCommentInput(e) {
    const id = e.currentTarget.dataset.id;
    const filteredList = this.data.filteredList.map(item =>
      item._id === id ? { ...item, commentInput: e.detail.value } : item
    );
    this.setData({ filteredList });
  },

  onCopyLink(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.link });
  },

  async onDecide(e) {
    const { id, status } = e.currentTarget.dataset;
    const item = this.data.filteredList.find(i => i._id === id);
    wx.showLoading({ title: '提交中' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'doApprove',
        data: { id, status, comment: (item && item.commentInput) || '' },
      });
      wx.hideLoading();
      if (res.result && res.result.success) {
        wx.showToast({ title: '已处理' });
        this.loadList();
      } else {
        wx.showToast({ title: res.result.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },
});
