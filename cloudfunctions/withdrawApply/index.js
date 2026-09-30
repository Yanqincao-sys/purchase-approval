const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const applicantOpenId = wxContext.OPENID;
  const { id } = event;

  if (!id) return { success: false, message: '缺少参数' };

  const docRef = db.collection('applies').doc(id);
  const doc = await docRef.get().catch(() => null);
  if (!doc || !doc.data) return { success: false, message: '申请不存在' };

  // 只有申请人本人才能撤回
  if (doc.data.applicantOpenId !== applicantOpenId) {
    return { success: false, message: '无权限撤回该申请' };
  }

  // 只有还在"待审批"状态的申请才能撤回，已经处理过的不能撤
  if (doc.data.status !== 'pending') {
    return { success: false, message: '该申请已被处理，无法撤回' };
  }

  await docRef.update({
    data: { status: 'withdrawn' },
  });

  return { success: true };
};
