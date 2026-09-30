Page({
  data: {
    relationLabel: '',
    inviteCode: '',
    creating: false,
    myName: '',
    codeInput: '',
    binding: false,
    myApprovers: [],
    qrcodeUrl: '',
    generatingQrcode: false,
  },

  onLoad(options) {
    // 场景一：对方点开了"转发卡片"，邀请码会带在小程序路径的 query 里，即 options.code
    // 场景二：对方扫了"邀请二维码"，邀请码会作为 scene 值传入，需要解码
    let code = options.code || '';
    if (!code && options.scene) {
      code = decodeURIComponent(options.scene);
    }
    if (code) {
      this.setData({ codeInput: code.toUpperCase() });
    }
  },

  onShow() {
    this.loadMyApprovers();
  },

  onShareAppMessage() {
    if (!this.data.inviteCode) {
      return {
        title: '邀请你绑定为审批人',
        path: '/pages/invite/invite',
      };
    }
    return {
      title: `${this.data.relationLabel ? this.data.relationLabel + '，' : ''}邀请你绑定为审批人`,
      path: `/pages/invite/invite?code=${this.data.inviteCode}`,
    };
  },

  onShareTimeline() {
    return {
      title: '购买申请审批 - 邀请绑定审批人',
      query: this.data.inviteCode ? `code=${this.data.inviteCode}` : '',
    };
  },

  onLabelInput(e) {
    this.setData({ relationLabel: e.detail.value });
  },

  onNameInput(e) {
    this.setData({ myName: e.detail.value });
  },

  async onCreateInvite() {
    this.setData({ creating: true, qrcodeUrl: '' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'createInvite',
        data: { relationLabel: this.data.relationLabel },
      });
      if (res.result && res.result.success) {
        this.setData({ inviteCode: res.result.code });
      } else {
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ creating: false });
    }
  },

  async onGenerateQrcode() {
    if (!this.data.inviteCode) return;
    this.setData({ generatingQrcode: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getInviteQrcode',
        data: { code: this.data.inviteCode },
      });
      if (res.result && res.result.success) {
        this.setData({ qrcodeUrl: res.result.fileID });
      } else {
        wx.showToast({ title: (res.result && res.result.message) || '生成二维码失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '生成二维码失败，请重试', icon: 'none' });
    } finally {
      this.setData({ generatingQrcode: false });
    }
  },

  async onBind() {
    const code = (this.data.codeInput || '').trim();
    const nickName = (this.data.myName || '').trim();

    if (!nickName) return wx.showToast({ title: '请填写你的称呼', icon: 'none' });
    if (!code) return wx.showToast({ title: '请输入邀请码', icon: 'none' });

    this.setData({ binding: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'bindInvite',
        data: { code, nickName },
      });
      if (res.result && res.result.success) {
        wx.showToast({ title: '绑定成功' });
        this.setData({ codeInput: '' });
      } else {
        wx.showToast({ title: (res.result && res.result.message) || '绑定失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
    } finally {
      this.setData({ binding: false });
    }
  },

  async loadMyApprovers() {
    const res = await wx.cloud.callFunction({ name: 'getMyApprovers' });
    this.setData({ myApprovers: (res.result && res.result.data) || [] });
  },

  onRemoveApprover(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认移除',
      content: `确定要移除审批人"${name}"吗？移除后 TA 将不再能审批你的申请。`,
      confirmColor: '#ff4d4d',
      success: async res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中' });
        try {
          const callRes = await wx.cloud.callFunction({
            name: 'unbindApprover',
            data: { relationId: id },
          });
          wx.hideLoading();
          if (callRes.result && callRes.result.success) {
            wx.showToast({ title: '已移除' });
            this.loadMyApprovers();
          } else {
            wx.showToast({ title: (callRes.result && callRes.result.message) || '移除失败', icon: 'none' });
          }
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '移除失败，请重试', icon: 'none' });
        }
      },
    });
  },
});
