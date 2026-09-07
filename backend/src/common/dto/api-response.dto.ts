import { ApiProperty } from '@nestjs/swagger';

/**
 * 通用成功响应
 */
export class ApiSuccessResponse<T> {
  @ApiProperty({ example: true, description: '请求是否成功' })
  success: boolean;

  @ApiProperty({ description: '响应数据' })
  data: T;

  @ApiProperty({ example: '操作成功', description: '响应消息（可选）' })
  message?: string;
}

/**
 * 通用错误响应
 */
export class ApiErrorResponse {
  @ApiProperty({ example: false, description: '请求是否成功' })
  success: boolean;

  @ApiProperty({ example: '错误信息', description: '错误消息' })
  message: string;

  @ApiProperty({ example: 'BAD_REQUEST', description: '错误代码（可选）' })
  error?: string;

  @ApiProperty({ example: 400, description: 'HTTP状态码' })
  statusCode: number;
}

/**
 * 分页响应
 */
export class PaginatedResponse<T> {
  @ApiProperty({ description: '数据列表', isArray: true })
  data: T[];

  @ApiProperty({ example: 100, description: '总记录数' })
  total: number;

  @ApiProperty({ example: 1, description: '当前页码' })
  page: number;

  @ApiProperty({ example: 10, description: '每页数量' })
  limit: number;

  @ApiProperty({ example: 10, description: '总页数' })
  totalPages: number;
}
