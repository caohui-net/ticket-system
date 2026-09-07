/**
 * 审批步骤配置接口
 */
export interface StepConfig {
  stepNumber: number;
  stepName: string;
  approverRole: string;
}

/**
 * 审批流程配置
 * 定义不同类型审批的步骤和审批角色
 */
export const APPROVAL_CONFIGS = {
  // 报修审核配置（单级）
  REPAIR_REVIEW: [
    {
      stepNumber: 1,
      stepName: '副主任审核',
      approverRole: 'VICE_DIRECTOR'
    },
  ],

  // 预算审核配置（单级）
  BUDGET_REVIEW: [
    {
      stepNumber: 1,
      stepName: '副主任审核',
      approverRole: 'VICE_DIRECTOR'
    },
  ],

  // 立项审批配置（三级）
  PROJECT_APPROVAL: [
    {
      stepNumber: 1,
      stepName: '一级审核',
      approverRole: 'DEPT_MANAGER'
    },
    {
      stepNumber: 2,
      stepName: '二级审核',
      approverRole: 'VICE_LEADER'
    },
    {
      stepNumber: 3,
      stepName: '终审',
      approverRole: 'TOP_LEADER'
    },
  ],
} as const;

/**
 * 审批类型
 */
export type ApprovalConfigType = keyof typeof APPROVAL_CONFIGS;
