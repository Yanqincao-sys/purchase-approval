const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  const res = await db
    .collection('relationships')
    .where({ ownerOpenId: openId, status: 'bound' })
    .get();

  const list = res.data.map(item => ({
    relationId: item._id,
    approverOpenId: item.approverOpenId,
    approverName: item.approverName,
    relationLabel: item.relationLabel,
  }));

  return { success: true, data: list };
};
