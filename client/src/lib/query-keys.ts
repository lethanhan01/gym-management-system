export const queryKeys = {
  packages: {
    all: ['packages'] as const,
    active: () => ['packages', 'active'] as const,
    list: (params?: Record<string, unknown>) => ['packages', 'list', params] as const,
    detail: (id: string) => ['packages', 'detail', id] as const,
  },
  trainers: {
    all: ['trainers'] as const,
    available: () => ['trainers', 'available'] as const,
  },
  subscription: {
    all: ['subscription'] as const,
    member: (memberId?: string) => ['subscription', 'member', memberId] as const,
  },
} as const
