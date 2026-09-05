/**
 * 当前用户接口
 * 从JWT token解析出的用户信息
 */
export interface CurrentUser {
  id: bigint;
  username: string;
  realName: string;
  email?: string;
}
