import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { OpenAPIObject, OperationObject, PathItemObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import packageJson from '../../../package.json'

const API_PREFIX = '/api/v1'
const DOCS_PATH = 'docs'
const PUBLIC_PATHS = new Set([
  '/',
  '/health',
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-verify',
  '/auth/line-login',
  '/members/self-register',
  '/line/webhook',
])

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['success', 'code', 'message'],
        properties: {
          success: { type: 'boolean', example: false },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Dữ liệu truyền vào không hợp lệ.' },
          details: { nullable: true },
        },
      },
    },
  },
})

const STANDARD_ERRORS: Record<string, ReturnType<typeof errorResponse>> = {
  400: errorResponse('Dữ liệu đầu vào không hợp lệ.'),
  401: errorResponse('JWT hoặc API key không hợp lệ, hoặc chưa được cung cấp.'),
  403: errorResponse('Tài khoản không có quyền thực hiện thao tác này.'),
  404: errorResponse('Không tìm thấy tài nguyên yêu cầu.'),
  500: errorResponse('Lỗi nội bộ máy chủ.'),
}

const successResponse = {
  'application/json': {
    schema: {
      type: 'object',
      required: ['success'],
      properties: {
        success: { type: 'boolean', example: true },
        data: { nullable: true, description: 'Dữ liệu trả về, tùy theo endpoint.' },
        message: { type: 'string', description: 'Thông báo kết quả, nếu có.' },
      },
    },
  },
}

const tagForPath = (path: string): string => {
  const route = path.replace(API_PREFIX, '')
  if (route === '/' || route === '/health') return 'Health'
  if (route.startsWith('/auth')) return 'Auth'
  if (route.startsWith('/line')) return 'LINE'
  if (route.startsWith('/devices')) return 'Devices'
  if (route.startsWith('/payments') || route.includes('/payment-accounts')) return 'Payments'
  if (route.startsWith('/training-sessions') || route.startsWith('/attendance') || route.startsWith('/member-progress') || route.endsWith('/progress')) return 'Training'
  if (route.startsWith('/workout-plans') || route.startsWith('/workout-logs') || route.startsWith('/exercises')) return 'Workout'
  if (route.startsWith('/rooms') || route.startsWith('/equipment') || route.startsWith('/maintenance-logs')) return 'Facility'
  if (route.startsWith('/subscriptions') || route.startsWith('/packages')) return 'Membership'
  if (route.startsWith('/feedback')) return 'Feedback'
  if (route.startsWith('/staff')) return 'Staff'
  if (route.startsWith('/members')) return 'Members'
  if (route.startsWith('/groups') || route.startsWith('/permissions') || route.startsWith('/users')) return 'RBAC'
  if (route.startsWith('/reports')) return 'Reports'
  if (route.startsWith('/notifications')) return 'Notifications'
  return 'API'
}

const isOperation = (value: unknown): value is OperationObject =>
  typeof value === 'object' && value !== null && 'responses' in value

const setOperationMetadata = (path: string, item: PathItemObject): void => {
  for (const value of Object.values(item)) {
    if (!isOperation(value)) continue

    value.tags = value.tags?.length ? value.tags : [tagForPath(path)]
    value.summary ??= value.operationId?.replace(/([a-z])([A-Z])/g, '$1 $2')
    value.responses = Object.fromEntries(
      Object.entries({ ...STANDARD_ERRORS, ...value.responses }).map(([status, response]) => {
        const fallback = STANDARD_ERRORS[status]
        if (!fallback || typeof response !== 'object' || response === null) return [status, response]
        const documented = response as Record<string, unknown>
        const content = documented.content ?? fallback?.content
        return [status, { ...fallback, ...documented, content }]
      }),
    )
    for (const status of ['200', '201', '202']) {
      const response = value.responses[status]
      if (response && typeof response === 'object' && !('$ref' in response)) {
        response.content ??= successResponse
      }
    }

    const route = path.replace(API_PREFIX, '')
    if (route.startsWith('/devices/')) {
      value.security = [{ deviceApiKey: [] }]
    } else if (PUBLIC_PATHS.has(route)) {
      value.security = []
    } else if (!value.security?.length) {
      value.security = [{ bearer: [] }]
    }
  }
}

export const setupSwagger = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Gym Management System API')
    .setDescription('Tài liệu REST API cho hệ thống quản lý phòng tập Gym.')
    .setVersion(packageJson.version)
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-device-api-key' }, 'deviceApiKey')
    .build()

  const documentFactory = (): OpenAPIObject => {
    const document = SwaggerModule.createDocument(app, config)
    Object.entries(document.paths).forEach(([path, item]) => setOperationMetadata(path, item))
    return document
  }

  SwaggerModule.setup(DOCS_PATH, app, documentFactory, {
    useGlobalPrefix: true,
    jsonDocumentUrl: `${DOCS_PATH}/openapi.json`,
    yamlDocumentUrl: `${DOCS_PATH}/openapi.yaml`,
  })
}
