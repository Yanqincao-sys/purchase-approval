const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const approverOpenId = wxContext.OPENID;
  const { code, nickName } = event;

  if (!code) return { success: false, message: '请输入邀请码' };

  const res = await db
    .collection('relationships')
    .where({ inviteCode: code.toUpperCase(), status: 'pending' })
    .get();

  if (!res.data || res.data.length === 0) {
    return { success: false, message: '邀请码无效或已被使用' };
  }

  const relation = res.data[0];

  await db.collection('relationships').doc(relation._id).update({
    data: {
      approverOpenId,
      approverName: nickName || '审批人',
      status: 'bound',
      bindTime: db.serverDate(),
    },
  });

  return { success: true };
};
