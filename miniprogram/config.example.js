// 复制本文件为 config.js，并填入你自己的值（config.js 不入库）
module.exports = {
  // 云开发环境 ID（云开发控制台 -> 环境 ID）
  envId: 'YOUR_CLOUD_ENV_ID',
  // 订阅消息模板「审核结果通知」：审批完成后通知申请人
  resultTemplateId: 'YOUR_RESULT_TEMPLATE_ID',
  // 订阅消息模板「待办事项提醒」：有新申请时通知审批人
  newApplyTemplateId: 'YOUR_NEW_APPLY_TEMPLATE_ID',
};
