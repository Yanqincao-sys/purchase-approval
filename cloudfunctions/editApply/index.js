const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 通知审批人"有新申请待审批"的订阅消息模板 ID（公共模板库："待办事项提醒"），跟 submitApply 保持一致
const { NEW_APPLY_TEMPLATE_ID } = require('./config');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const applicantOpenId = wxContext.OPENID;
  const { id, title, link, price, reason } = event;

  if (!id || !title || !price) {
    return { success: false, message: '参数不完整' };
  }

  const docRef = db.collection('applies').doc(id);
  const doc = await docRef.get().catch(() => null);
  if (!doc || !doc.data) return { success: false, message: '申请不存在' };

  // 只有申请人本人才能编辑
  if (doc.data.applicantOpenId !== applicantOpenId) {
    return { success: false, message: '无权限编辑该申请' };
  }

  // 只有"已撤回"状态的申请才能编辑，其它状态一律拒绝
  if (doc.data.status !== 'withdrawn') {
    return { success: false, message: '只有已撤回的申请才能编辑' };
  }

  // 直接在原记录上覆盖内容，重新变回待审批，不产生新记录
  await docRef.update({
    data: {
      title,
      link: link || '',
      price: Number(price),
      reason: reason || '',
      status: 'pending',
      comment: '',
      approveTime: null,
      createTime: db.serverDate(),
    },
  });

  const approverOpenId = doc.data.approverOpenId;

  // 重新提交后，跟首次提交一样，尝试通知审批人
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: approverOpenId,
      templateId: NEW_APPLY_TEMPLATE_ID,
      page: 'pages/approve/approve',
      data: {
        thing10: { value: title.slice(0, 20) },
        amount17: { value: Number(price).toFixed(2) },
        thing2: { value: '有新的购买申请待你审批'.slice(0, 20) },
        time9: { value: formatTime(Date.now()) },
      },
    });
  } catch (err) {
    console.warn('发送订阅消息失败（可能对方尚未授权）', err);
  }

  return { success: true, id };
};

function formatTime(ts) {
  const d = new Date(ts);
  const pad = n => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
