// 订阅消息模板 ID：公共模板库"审核结果通知"，审批完成后通知申请人
const SUBSCRIBE_TEMPLATE_ID = require('../../config').resultTemplateId;

Page({
  data: {
    form: { title: '', link: '', price: '', reason: '', approverName: '', approverOpenId: '' },
    approverNames: [],
    approverList: [], // [{ name, openId }]
    submitting: false,
    lastSubmittedId: '',
    lastSubmittedTitle: '',
    editMode: false,
    editId: '',
  },

  onShow() {
    this.loadApprovers();

    // apply 是 tabBar 页面，switchTab 不支持带 query 参数，
    // 所以从"我的申请"/详情页点"编辑"过来时，是通过 app.globalData 传的 id
    const app = getApp();
    if (app.globalData && app.globalData.editApplyId) {
      const id = app.globalData.editApplyId;
      app.globalData.editApplyId = null;
      this.loadForEdit(id);
    }
  },

  async loadForEdit(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('applies').doc(id).get();
      const item = res.data;
      wx.hideLoading();
      if (item.status !== 'withdrawn') {
        wx.showToast({ title: '只有已撤回的申请才能编辑', icon: 'none' });
        return;
      }
      this.setData({
        editMode: true,
        editId: id,
        form: {
          title: item.title,
          link: item.link || '',
          price: String(item.price),
          reason: item.reason || '',
          approverName: item.approverName,
          approverOpenId: item.approverOpenId,
        },
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  async loadApprovers() {
    const res = await wx.cloud.callFunction({ name: 'getMyApprovers' });
    const list = (res.result && res.result.data) || [];
    this.setData({
      approverList: list,
      approverNames: list.map(item =>
        item.relationLabel ? `${item.approverName}（${item.relationLabel}）` : item.approverName
      ),
    });
  },

  onGoInvite() {
    // pages/invite/invite 是 tabBar 页面，必须用 switchTab 跳转，不能用 navigateTo
    wx.switchTab({ url: '/pages/invite/invite' });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onPickApprover(e) {
    const idx = e.detail.value;
    const approver = this.data.approverList[idx];
    this.setData({
      'form.approverName': approver.approverName,
      'form.approverOpenId': approver.approverOpenId,
    });
  },

  async onSubmit() {
    const { title, price, approverOpenId } = this.data.form;
    if (!title) return wx.showToast({ title: '请填写商品名称', icon: 'none' });
    if (!price) return wx.showToast({ title: '请填写价格', icon: 'none' });
    if (!approverOpenId) return wx.showToast({ title: '请选择审批人', icon: 'none' });

    // 先请求订阅消息授权，用户点击"允许"后才能给他推送审批结果通知
    try {
      await wx.requestSubscribeMessage({ tmplIds: [SUBSCRIBE_TEMPLATE_ID] });
    } catch (err) {
      // 用户拒绝也允许继续提交，只是收不到推送
      console.warn('订阅消息授权失败或被拒绝', err);
    }

    this.setData({ submitting: true });
    try {
      const res = await wx.cloud.callFunction({
        name: this.data.editMode ? 'editApply' : 'submitApply',
        data: this.data.editMode
          ? { id: this.data.editId, ...this.data.form }
          : { ...this.data.form },
      });
      if (res.result && res.result.success) {
        wx.showToast({ title: this.data.editMode ? '重新提交成功' : '提交成功，等待审批' });
        this.setData({
          lastSubmittedId: this.data.editMode ? this.data.editId : res.result.id,
          lastSubmittedTitle: this.data.form.title,
        });
      } else {
        wx.showToast({ title: res.result.message || '提交失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onNewOne() {
    this.setData({
      form: { title: '', link: '', price: '', reason: '', approverName: '', approverOpenId: '' },
      lastSubmittedId: '',
      lastSubmittedTitle: '',
      editMode: false,
      editId: '',
    });
  },

  onShareAppMessage() {
    if (this.data.lastSubmittedId) {
      return {
        title: `有一笔购买申请待你审批：${this.data.lastSubmittedTitle}`,
        path: `/pages/approve/approve?id=${this.data.lastSubmittedId}`,
      };
    }
    return {
      title: '购买申请审批小程序',
      path: '/pages/list/list',
    };
  },
});
