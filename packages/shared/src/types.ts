// Domain types shared between frontend and backend

export type UserRole = 'CUSTOMER' | 'ADMIN'

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PAID'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export type UploadStatus = 'PENDING' | 'VALIDATED' | 'REJECTED'

export type PrintZone = 'FRONT' | 'BACK' | 'TAG'

export type MockupStatus = 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  statusCode: number
  message: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
