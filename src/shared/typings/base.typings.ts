export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: any;
  timestamp: string;
  path: string;
}

export enum SEVERITY {
  NONE = 0,
  VERY_MILD = 1,
  MILD = 2,
  MODERATE = 3,
  SEVERE = 4,
  VERY_SEVERE = 5,
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
