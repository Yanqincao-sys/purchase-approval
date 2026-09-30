const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { relationId } = event;

  if (!relationId) return { success: false, message: '缺少参数' };

  const doc = await db.collection('relationships').doc(relationId).get().catch(() => null);
  if (!doc || !doc.data) return { success: false, message: '记录不存在' };

  // 只有关系的创建者（申请人本人）才能移除这条绑定
  if (doc.data.ownerOpenId !== openId) {
    return { success: false, message: '无权限操作' };
  }

  await db.collection('relationships').doc(relationId).remove();

  return { success: true };
};
