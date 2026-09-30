const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 通知审批人"有新申请待审批"的订阅消息模板 ID（公共模板库："待办事项提醒"）
const { NEW_APPLY_TEMPLATE_ID } = require('./config');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const applicantOpenId = wxContext.OPENID;
  const { title, link, price, reason, approverOpenId, approverName } = event;

  if (!title || !price || !approverOpenId) {
    return { success: false, message: '参数不完整' };
  }

  const addRes = await db.collection('applies').add({
    data: {
      title,
      link: link || '',
      price: Number(price),
      reason: reason || '',
      applicantOpenId,
      approverOpenId,
      approverName,
      status: 'pending',
      comment: '',
      approveTime: null,
      createTime: db.serverDate(),
    },
  });

  // 尝试给审批人推送"有新申请"的订阅消息（需要审批人此前也订阅过该模板，
  // 实际项目里可以让审批人首次进入"待我审批"页时弹一次 requestSubscribeMessage）
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: approverOpenId,
      templateId: NEW_APPLY_TEMPLATE_ID,
      page: 'pages/approve/approve',
      data: {
        thing10: { value: title.slice(0, 20) }, // 事项名称
        amount17: { value: Number(price).toFixed(2) }, // 金额
        thing2: { value: '有新的购买申请待你审批'.slice(0, 20) }, // 提醒内容
        time9: { value: formatTime(Date.now()) }, // 创建日期
      },
    });
  } catch (err) {
    console.warn('发送订阅消息失败（可能对方尚未授权）', err);
  }

  return { success: true, id: addRes._id };
};

function formatTime(ts) {
  const d = new Date(ts);
  const pad = n => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
