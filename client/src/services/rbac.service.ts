import api from './api'

export interface Permission {
  permissionId: string
  code: string
  name: string
  description: string | null
}

export interface Group {
  groupId: string
  name: string
  description: string | null
  memberCount: number
  permissionCount: number
  permissions?: Permission[]
  createdAt: string
  deletedAt: string | null
}

export interface GroupDetail extends Group {
  permissions: Permission[]
}

export interface User {
  userId: string
  email: string
  fullName: string
  phone: string | null
  status: string
  roles: string[]
  createdAt: string
  deletedAt: string | null
}

export const rbacService = {
  // Permissions
  listPermissions: async (params?: { page?: number; pageSize?: number; resource?: string }): Promise<{ data: Permission[]; total: number }> => {
    const res = await api.get<{
      success: boolean
      data: Permission[]
      meta: { total: number }
    }>('/permissions', { params })
    return { data: res.data.data, total: res.data.meta.total }
  },

  getPermission: async (id: string): Promise<Permission> => {
    const res = await api.get<{ success: boolean; data: Permission }>(`/permissions/${id}`)
    return res.data.data
  },

  // Groups
  listGroups: async (params?: {
    page?: number; pageSize?: number; search?: string; includeDeleted?: boolean
  }): Promise<{ data: Group[]; total: number }> => {
    const res = await api.get<{
      success: boolean
      data: Group[]
      meta: { total: number; totalItems?: number }
    }>('/groups', { params })
    return { data: res.data.data, total: res.data.meta.totalItems ?? res.data.meta.total }
  },

  getGroup: async (id: string): Promise<GroupDetail> => {
    const res = await api.get<{ success: boolean; data: GroupDetail }>(`/groups/${id}`)
    return res.data.data
  },

  updateGroup: async (id: string, data: { name?: string; description?: string }): Promise<GroupDetail> => {
    const res = await api.patch<{ success: boolean; data: GroupDetail }>(`/groups/${id}`, data)
    return res.data.data
  },

  deleteGroup: async (id: string): Promise<void> => {
    await api.delete(`/groups/${id}`)
  },

  assignPermissions: async (groupId: string, permissions: string[]): Promise<{ added: string[]; skipped: string[] }> => {
    const res = await api.post<{ success: boolean; data: { added: string[]; skipped: string[] } }>(
      `/groups/${groupId}/permissions`,
      { permissions }
    )
    return res.data.data
  },

  revokePermission: async (groupId: string, permissionId: string): Promise<void> => {
    await api.delete(`/groups/${groupId}/permissions/${permissionId}`)
  },

  // Users admin
  listUsers: async (params?: {
    page?: number; pageSize?: number; search?: string; groupId?: string; role?: string; status?: string
  }): Promise<{ data: User[]; total: number }> => {
    const res = await api.get<{
      success: boolean
      data: User[]
      meta: { total: number; totalItems?: number }
    }>('/users', { params })
    return { data: res.data.data, total: res.data.meta.totalItems ?? res.data.meta.total }
  },

  getUser: async (id: string): Promise<User> => {
    const res = await api.get<{ success: boolean; data: User }>(`/users/${id}`)
    return res.data.data
  },

  assignGroup: async (userId: string, groupId: string): Promise<void> => {
    await api.post(`/users/${userId}/groups`, { groupId })
  },

  revokeGroup: async (userId: string, groupId: string): Promise<void> => {
    await api.delete(`/users/${userId}/groups/${groupId}`)
  },
}
