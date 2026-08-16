import { ExerciseDbV2Client } from './exercise-db-v2.client'

const apiKey = 'rapid-secret-key'

function clientWith(values: Record<string, unknown>) {
  return new ExerciseDbV2Client({ get: jest.fn((key: string) => values[key]) } as any)
}

function exercise(overrides: Record<string, unknown> = {}) {
  return {
    id: '0001',
    name: 'Push-up',
    bodyPart: 'chest',
    target: 'pectorals',
    secondaryMuscles: ['triceps', 'deltoids'],
    equipment: 'body weight',
    instructions: ['Lower body', 'Push up'],
    description: 'A push-up.',
    gifUrl: null,
    ...overrides,
  }
}

describe('ExerciseDbV2Client', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = fetchMock
  })

  it('requests the fixed RapidAPI endpoint with stable pagination and headers', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([exercise()]), { status: 200 }))
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    const page = await client.allExercises().next()

    expect(page.value).toEqual([
      expect.objectContaining({
        externalId: '0001',
        bodyPart: 'chest',
        targetMuscle: 'pectorals',
        secondaryMuscles: ['triceps', 'deltoids'],
        equipmentName: 'body weight',
        imageUrl: null,
      }),
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'exercisedb.p.rapidapi.com',
        pathname: '/exercises',
        search: '?limit=2&offset=0&sortMethod=id&sortOrder=ascending',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
        }),
      })
    )
  })

  it('keeps fields separate and does not merge into muscleGroup string', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([exercise()]), { status: 200 }))
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    const first = (await client.allExercises().next()).value![0]

    expect(first.bodyPart).toBe('chest')
    expect(first.targetMuscle).toBe('pectorals')
    expect(first.secondaryMuscles).toEqual(['triceps', 'deltoids'])
    expect(first.equipmentName).toBe('body weight')
  })

  it('captures gifUrl into imageUrl when present', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([exercise({ gifUrl: 'https://example.com/pushup.gif' })]), {
        status: 200,
      })
    )
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    const first = (await client.allExercises().next()).value![0]

    expect(first.imageUrl).toBe('https://example.com/pushup.gif')
  })

  it('sets imageUrl to null when gifUrl is absent', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([exercise({ gifUrl: null })]), { status: 200 })
    )
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    const first = (await client.allExercises().next()).value![0]

    expect(first.imageUrl).toBeNull()
  })

  it('stores instructions as array and uses description field', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          exercise({ description: 'A push-up.', instructions: ['Step 1', 'Step 2', 'Step 3'] }),
        ]),
        { status: 200 }
      )
    )
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    const first = (await client.allExercises().next()).value![0]

    expect(first.instructions).toEqual(['Step 1', 'Step 2', 'Step 3'])
    expect(first.description).toBe('A push-up.')
  })

  it('falls back description to first 3 instructions when description is blank', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          exercise({ description: '  ', instructions: [' One ', 'Two', 'Three', 'Four'] }),
        ]),
        { status: 200 }
      )
    )
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    const first = (await client.allExercises().next()).value![0]

    expect(first.description).toBe('One Two Three')
    expect(first.instructions).toEqual(['One', 'Two', 'Three', 'Four'])
  })

  it('keeps hashes canonical across two identical fetches', async () => {
    const ex = exercise({ description: '  ', instructions: [' One ', 'Two', 'Three', 'Four'] })
    fetchMock.mockResolvedValue(new Response(JSON.stringify([ex]), { status: 200 }))
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    const first = (await client.allExercises().next()).value![0]
    fetchMock.mockResolvedValue(new Response(JSON.stringify([ex]), { status: 200 }))
    const second = (await client.allExercises().next()).value![0]

    expect(first.contentHash).toBe(second.contentHash)
  })

  it('does not retry non-rate-limited 4xx responses and redacts the API key', async () => {
    fetchMock.mockResolvedValue(new Response(`invalid key ${apiKey}`, { status: 404 }))
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_RETRY_LIMIT: 3,
    })

    let error: Error | undefined
    try {
      await client.allExercises().next()
    } catch (caught) {
      error = caught as Error
    }
    expect(error?.message).toContain('[REDACTED]')
    expect(error?.message).not.toContain(apiKey)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([429, 503])('retries transient HTTP status %i', async (status) => {
    fetchMock
      .mockResolvedValueOnce(new Response('temporary', { status, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([exercise()]), { status: 200 }))
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_RETRY_LIMIT: 1,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    await client.allExercises().next()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    new TypeError('socket closed'),
    Object.assign(new Error('request aborted'), { name: 'AbortError' }),
  ])('retries network and timeout failures', async (failure) => {
    jest.useFakeTimers()
    fetchMock
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(new Response(JSON.stringify([exercise()]), { status: 200 }))
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_RETRY_LIMIT: 1,
      EXERCISEDB_PAGE_SIZE: 2,
    })

    const result = client.allExercises().next()
    await jest.advanceTimersByTimeAsync(250)
    await result
    expect(fetchMock).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })

  it('rejects records that cannot fit the exercise table columns', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([exercise({ name: 'x'.repeat(101) })]), { status: 200 })
    )
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 10,
    })

    await expect(client.allExercises().next()).rejects.toThrow('name longer than 100')
  })

  it.each([
    ['id', { id: 'x'.repeat(192) }, 'id longer than 191'],
    ['name', { name: 'x'.repeat(101) }, 'name longer than 100'],
    ['equipment', { equipment: 'x'.repeat(101) }, 'equipment longer than 100'],
    ['bodyPart', { bodyPart: 'x'.repeat(101) }, 'bodyPart longer than 100'],
    ['target', { target: 'x'.repeat(101) }, 'target longer than 100'],
  ])(
    'rejects a provider %s value beyond its database column limit',
    async (_field, override, message) => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify([exercise(override)]), { status: 200 })
      )
      const client = clientWith({
        EXERCISEDB_SYNC_ENABLED: 'true',
        EXERCISEDB_API_KEY: apiKey,
        EXERCISEDB_PAGE_SIZE: 10,
      })

      await expect(client.allExercises().next()).rejects.toThrow(message)
    }
  )

  it('detects records after a short page during strict preflight pagination', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify([exercise()]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([exercise({ id: '0002' })]), { status: 200 })
      )
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 10,
    })
    const pages = client.allExercises({ pageSize: 10, strictPagination: true })

    await pages.next()
    await expect(pages.next()).rejects.toThrow('pagination is unstable')
  })

  it('fetches an empty terminal page after an exact multiple during strict preflight pagination', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify([exercise(), exercise({ id: '0002' })]), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
    const client = clientWith({
      EXERCISEDB_SYNC_ENABLED: 'true',
      EXERCISEDB_API_KEY: apiKey,
      EXERCISEDB_PAGE_SIZE: 2,
    })
    const pages: unknown[] = []

    for await (const page of client.allExercises({ pageSize: 2, strictPagination: true }))
      pages.push(page)

    expect(pages).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
