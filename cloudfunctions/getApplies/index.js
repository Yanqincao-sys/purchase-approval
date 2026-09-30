const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { role } = event; // 'applicant' | 'approver'

  const field = role === 'approver' ? 'approverOpenId' : 'applicantOpenId';
  const query = { [field]: openId };

  // 不再固定过滤 pending，前端自行按状态筛选展示

  const res = await db
    .collection('applies')
    .where(query)
    .orderBy('createTime', 'desc')
    .get();

  return { success: true, data: res.data };
};
