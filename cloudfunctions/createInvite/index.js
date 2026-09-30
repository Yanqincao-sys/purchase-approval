const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function genCode(len = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的 0/O/I/1/L
  let code = '';
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const ownerOpenId = wxContext.OPENID;
  const { relationLabel } = event; // 例如"男朋友""爸爸"，用于展示，不是必需

  const code = genCode();

  const addRes = await db.collection('relationships').add({
    data: {
      ownerOpenId,
      inviteCode: code,
      relationLabel: relationLabel || '',
      approverOpenId: null,
      approverName: '',
      status: 'pending',
      createTime: db.serverDate(),
    },
  });

  return { success: true, code, id: addRes._id };
};
