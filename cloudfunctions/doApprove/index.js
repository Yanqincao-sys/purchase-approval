const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 审批结果通知给申请人的订阅消息模板 ID（公共模板库："审核结果通知"）
const { RESULT_TEMPLATE_ID } = require('./config');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const approverOpenId = wxContext.OPENID;
  const { id, status, comment } = event;

  if (!id || !['approved', 'rejected'].includes(status)) {
    return { success: false, message: '参数不合法' };
  }

  const docRef = db.collection('applies').doc(id);
  const doc = await docRef.get();
  const apply = doc.data;

  if (!apply) return { success: false, message: '申请不存在' };
  if (apply.approverOpenId !== approverOpenId) {
    return { success: false, message: '无权限审批该申请' };
  }
  if (apply.status !== 'pending') {
    return { success: false, message: '该申请已被处理' };
  }

  await docRef.update({
    data: {
      status,
      comment: comment || '',
      approveTime: Date.now(),
    },
  });

  const statusText = status === 'approved' ? '已通过' : '未通过';

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: apply.applicantOpenId,
      templateId: RESULT_TEMPLATE_ID,
      page: `pages/detail/detail?id=${id}`,
      data: {
        thing7: { value: apply.title.slice(0, 20) }, // 申请内容
        amount8: { value: Number(apply.price).toFixed(2) }, // 报单金额
        phrase4: { value: statusText }, // 审批结果
        thing9: { value: (comment || '无').slice(0, 20) }, // 审核意见
        time5: { value: formatTime(Date.now()) }, // 审核时间
      },
    });
  } catch (err) {
    console.warn('发送审批结果订阅消息失败（申请人可能尚未授权）', err);
  }

  return { success: true };
};

function formatTime(ts) {
  const d = new Date(ts);
  const pad = n => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
