import { applyDecorators, SetMetadata } from '@nestjs/common'
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger'

export const PERMISSION_KEY = 'required_permission'

export const RequirePermission = (permission: string) =>
  applyDecorators(
    SetMetadata(PERMISSION_KEY, permission),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'JWT không hợp lệ hoặc chưa được cung cấp.' }),
    ApiForbiddenResponse({ description: `Tài khoản cần quyền: ${permission}.` }),
  )
