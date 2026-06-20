import api from './api'

export interface Package {
  packageId: string
  packageCode: string
  name: string
  durationDays: number
  price: string
  benefits: string | null
  includesPt: boolean
  status: 'active' | 'inactive'
  stats: {
    activeSubscriptions: number
    pendingSubscriptions: number
    totalSubscriptions: number
  } | null
  createdAt: string
  deletedAt: string | null
}

export interface ListPackagesParams {
  page?: number
  pageSize?: number
  status?: 'active' | 'inactive' | 'deleted'
  search?: string
  minDuration?: number
  maxDuration?: number
  minPrice?: string
  maxPrice?: string
  includeDeleted?: boolean
  sort?: string
}

export interface CreatePackageDto {
  packageCode?: string
  name: string
  durationDays: number
  price: number
  benefits?: string
  includesPt?: boolean
  status?: 'active' | 'inactive'
}

export interface UpdatePackageDto {
  packageCode?: string
  name?: string
  durationDays?: number
  price?: number
  benefits?: string
  includesPt?: boolean
}

interface Meta {
  page: number
  pageSize: number
  total: number
}

const packageService = {
  async list(params?: ListPackagesParams): Promise<{ data: Package[]; meta: Meta }> {
    const res = await api.get<{ success: boolean; data: Package[]; meta: Meta }>('/packages', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  async get(id: string): Promise<Package> {
    const res = await api.get<{ success: boolean; data: Package }>(`/packages/${id}`)
    return res.data.data
  },

  async create(dto: CreatePackageDto): Promise<Package> {
    const res = await api.post<{ success: boolean; data: Package }>('/packages', dto)
    return res.data.data
  },

  async update(id: string, dto: UpdatePackageDto): Promise<Package> {
    const res = await api.patch<{ success: boolean; data: Package }>(`/packages/${id}`, dto)
    return res.data.data
  },

  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<Package> {
    const res = await api.patch<{ success: boolean; data: Package }>(`/packages/${id}/status`, { status })
    return res.data.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/packages/${id}`)
  },
}

export default packageService
