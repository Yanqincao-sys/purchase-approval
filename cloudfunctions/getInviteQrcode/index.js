const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { code } = event;

  if (!code) {
    return { success: false, message: '缺少邀请码' };
  }

  try {
    // 小程序还没有正式发布，只有开发版/体验版，所以这里固定生成体验版的码
    // 正式发布后，如果想让二维码指向线上正式版，把 env_version 改成 'release'，并且可以把 check_path 改回 true（默认值）
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: code,
      page: 'pages/invite/invite',
      env_version: 'trial',
      check_path: false, // 小程序还没有正式发布，必须关掉这个校验，否则一律报 41030
      width: 280,
    });

    // result.buffer 是二维码图片的二进制内容，上传到云存储，返回 fileID 给前端直接展示
    const upload = await cloud.uploadFile({
      cloudPath: `invite-qrcode/${code}-${Date.now()}.png`,
      fileContent: result.buffer,
    });

    return { success: true, fileID: upload.fileID };
  } catch (err) {
    console.error('生成邀请二维码失败', err);
    return { success: false, message: '生成二维码失败，请重试' };
  }
};
