const STATUS_TEXT = { pending: '审批中', approved: '已通过', rejected: '未通过', withdrawn: '已撤回' };

Page({
  data: { list: [], filteredList: [], activeFilter: 'all' },

  onShow() {
    this.loadList();
  },

  async loadList() {
    const res = await wx.cloud.callFunction({ name: 'getApplies', data: { role: 'applicant' } });
    const list = (res.result && res.result.data) || [];
    const formatted = list.map(item => ({
      ...item,
      statusText: STATUS_TEXT[item.status] || item.status,
      approveTimeText: item.approveTime
        ? this.formatTime(item.approveTime)
        : '',
    }));
    this.setData({ list: formatted }, () => {
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
    let filteredList = list;
    if (activeFilter !== 'all') {
      filteredList = list.filter(item => item.status === activeFilter);
    }
    this.setData({ filteredList });
  },

  formatTime(ts) {
    const d = new Date(ts);
    const pad = n => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  onTapCard(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}&role=applicant` });
  },

  // 编辑已撤回的申请，apply 是 tabBar 页面，switchTab 不支持带 query 参数，
  // 所以用 app.globalData 把要编辑的 id 传过去
  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    getApp().globalData.editApplyId = id;
    wx.switchTab({ url: '/pages/apply/apply' });
  },

  // 撤回申请，catchtap 已阻止冒泡，不会同时触发 onTapCard 的跳转
  onWithdraw(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认撤回这条申请？',
      content: '撤回后审批人将无法再处理这条申请，此操作不可恢复',
      confirmColor: '#ff4d6d',
      success: async res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '撤回中' });
        try {
          const cbRes = await wx.cloud.callFunction({ name: 'withdrawApply', data: { id } });
          wx.hideLoading();
          if (cbRes.result && cbRes.result.success) {
            wx.showToast({ title: '已撤回' });
            this.loadList();
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
});
