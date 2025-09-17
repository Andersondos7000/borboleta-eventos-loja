/**
 * Testes das Edge Functions do Supabase
 * 
 * Este arquivo serve como índice para todos os testes das Edge Functions,
 * fornecendo utilitários comuns e configurações de teste.
 */

import { assertEquals, assertExists, assertRejects } from 'std/testing/asserts.ts'
import { createClient } from 'supabase'

// Exportar todos os testes
export * from './sync-cart.test.ts'
export * from './sync-products.test.ts'
export * from './sync-orders.test.ts'
export * from './sync-events.test.ts'

// Tipos para mocks e testes
export interface MockSupabaseClient {
  from: (_table: string) => MockQueryBuilder
  auth: {
    getUser: () => Promise<{ data: { user: any }, error: any }>
  }
}

export interface MockQueryBuilder {
  select: (_columns?: string) => MockQueryBuilder
  insert: (data: any) => Promise<{ data: any[], error: any }>
  update: (data: any) => MockQueryBuilder
  upsert: (data: any) => Promise<{ data: any[], error: any }>
  delete: () => MockQueryBuilder
  eq: (_column: string, _value: any) => MockQueryBuilder
  neq: (_column: string, _value: any) => MockQueryBuilder
  gt: (_column: string, _value: any) => MockQueryBuilder
  gte: (_column: string, _value: any) => MockQueryBuilder
  lt: (_column: string, _value: any) => MockQueryBuilder
  lte: (_column: string, _value: any) => MockQueryBuilder
  like: (_column: string, _pattern: string) => MockQueryBuilder
  ilike: (_column: string, _pattern: string) => MockQueryBuilder
  in: (_column: string, _values: any[]) => MockQueryBuilder
  order: (_column: string, _options?: { ascending?: boolean }) => MockQueryBuilder
  limit: (_count: number) => Promise<{ data: any[], error: any }>
  single: () => Promise<{ data: any, error: any }>
}

export interface TestRequest {
  method: string
  headers: Record<string, string>
  body: string
  url: string
}

export interface TestResponse {
  status: number
  headers: Record<string, string>
  json: () => Promise<any>
  text: () => Promise<string>
}

// Utilitários de teste
export class TestUtils {
  /**
   * Cria um mock do cliente Supabase
   */
  static createMockSupabase(customResponses?: Record<string, any>): MockSupabaseClient {
    const defaultResponses = {
      select: { data: [], error: null },
      insert: { data: [], error: null },
      update: { data: [], error: null },
      upsert: { data: [], error: null },
      delete: { data: [], error: null },
      user: { data: { user: { id: 'test-user', role: 'authenticated' } }, error: null }
    }

    const responses = { ...defaultResponses, ...customResponses }

    return {
      from: (_table: string) => ({
        select: (_columns?: string) => ({
          eq: (_column: string, _value: any) => ({
            single: () => Promise.resolve(responses.select),
            limit: (_count: number) => Promise.resolve(responses.select)
          }),
          gte: (_column: string, _value: any) => ({
            limit: (_count: number) => Promise.resolve(responses.select)
          }),
          order: (_column: string) => Promise.resolve(responses.select)
        }),
        insert: (data: any) => Promise.resolve({
          ...responses.insert,
          data: Array.isArray(data) ? data : [data]
        }),
        update: (data: any) => ({
          eq: (_column: string, value: any) => Promise.resolve({
            ...responses.update,
            data: [{ ...data, id: value }]
          })
        }),
        upsert: (data: any) => Promise.resolve({
          ...responses.upsert,
          data: Array.isArray(data) ? data : [data]
        }),
        delete: () => ({
          eq: (_column: string, _value: any) => Promise.resolve(responses.delete)
        })
      }),
      auth: {
        getUser: () => Promise.resolve(responses.user)
      }
    } as MockSupabaseClient
  }

  /**
   * Cria uma requisição de teste
   */
  static createTestRequest(
    url: string,
    method: string = 'POST',
    body?: any,
    headers?: Record<string, string>
  ): Request {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    }

    return new Request(url, {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * Cria uma requisição não autenticada
   */
  static createUnauthenticatedRequest(
    url: string,
    method: string = 'POST',
    body?: any
  ): Request {
    return new Request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * Cria uma requisição OPTIONS para teste de CORS
   */
  static createOptionsRequest(url: string): Request {
    return new Request(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    })
  }

  /**
   * Valida resposta de sucesso
   */
  static async assertSuccessResponse(
    response: Response,
    expectedStatus: number = 200
  ) {
    assertEquals(response.status, expectedStatus)
    
    const result = await response.json()
    assertEquals(result.success, true)
    assertExists(result.data)
    
    return result
  }

  /**
   * Valida resposta de erro
   */
  static async assertErrorResponse(
    response: Response,
    expectedStatus: number,
    expectedError?: string
  ) {
    assertEquals(response.status, expectedStatus)
    
    const result = await response.json()
    assertExists(result.error)
    
    if (expectedError) {
      assertEquals(result.error, expectedError)
    }
    
    return result
  }

  /**
   * Valida headers CORS
   */
  static assertCorsHeaders(response: Response) {
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*')
    assertExists(response.headers.get('Access-Control-Allow-Methods'))
    assertExists(response.headers.get('Access-Control-Allow-Headers'))
  }

  /**
   * Simula delay para testes de concorrência
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Gera dados de teste aleatórios
   */
  static generateTestData(type: 'product' | 'order' | 'event' | 'cart', count: number = 1) {
    const generators = {
      product: () => ({
        id: Math.floor(Math.random() * 1000),
        name: `Product ${Math.random().toString(36).substring(2, 11)}`,
        price: Math.round(Math.random() * 100 * 100) / 100,
        stock: Math.floor(Math.random() * 100),
        category: ['electronics', 'clothing', 'books', 'home'][Math.floor(Math.random() * 4)]
      }),
      order: () => ({
        id: Math.floor(Math.random() * 1000),
        user_id: `user-${Math.random().toString(36).substring(2, 11)}`,
        status: ['pending', 'paid', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
        total: Math.round(Math.random() * 500 * 100) / 100,
        created_at: new Date().toISOString()
      }),
      event: () => ({
        id: Math.floor(Math.random() * 1000),
        name: `Event ${Math.random().toString(36).substring(2, 11)}`,
        date: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        location: `Venue ${Math.random().toString(36).substring(2, 7)}`,
        status: ['active', 'completed', 'cancelled'][Math.floor(Math.random() * 3)],
        organizer_id: `org-${Math.random().toString(36).substring(2, 11)}`
      }),
      cart: () => ({
        id: Math.random().toString(36).substring(2, 11),
        user_id: `user-${Math.random().toString(36).substring(2, 11)}`,
        product_id: Math.floor(Math.random() * 100),
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.round(Math.random() * 100 * 100) / 100,
        added_at: new Date().toISOString()
      })
    }

    return Array.from({ length: count }, () => generators[type]())
  }

  /**
   * Executa testes de performance
   */
  static async measurePerformance<T>(
    name: string,
    fn: () => Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T, avgTime: number, totalTime: number }> {
    const times: number[] = []
    let result: T

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      result = await fn()
      const end = performance.now()
      times.push(end - start)
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const avgTime = totalTime / iterations

    console.log(`Performance [${name}]: ${avgTime.toFixed(2)}ms avg (${iterations} iterations)`)

    return { result: result!, avgTime, totalTime }
  }

  /**
   * Testa concorrência
   */
  static async testConcurrency<T>(
    name: string,
    fn: () => Promise<T>,
    concurrency: number = 10
  ): Promise<T[]> {
    console.log(`Testing concurrency [${name}]: ${concurrency} concurrent requests`)
    
    const start = performance.now()
    const promises = Array.from({ length: concurrency }, () => fn())
    const results = await Promise.all(promises)
    const end = performance.now()

    console.log(`Concurrency test [${name}] completed in ${(end - start).toFixed(2)}ms`)
    
    return results
  }
}

// Constantes de teste
export const TEST_CONSTANTS = {
  URLS: {
    SYNC_CART: 'https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/sync-cart',
  SYNC_PRODUCTS: 'https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/sync-products',
  SYNC_ORDERS: 'https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/sync-orders',
  SYNC_EVENTS: 'https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/sync-events'
  },
  HEADERS: {
    DEFAULT: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    UNAUTHENTICATED: {
      'Content-Type': 'application/json'
    },
    CORS: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
  },
  ACTIONS: {
    CART: ['sync', 'merge', 'backup', 'restore'],
    PRODUCTS: ['sync', 'update_stock', 'reserve_stock', 'release_stock', 'bulk_update'],
    ORDERS: ['sync', 'create', 'update_status', 'cancel', 'process_payment', 'get_analytics'],
    EVENTS: ['sync', 'create', 'update', 'cancel', 'buy_ticket', 'use_ticket', 'get_analytics']
  },
  TIMEOUTS: {
    SHORT: 1000,
    MEDIUM: 5000,
    LONG: 10000
  }
} as const

// Configuração global de testes
export const setupTests = () => {
  // Configurar timeouts
  globalThis.setTimeout = globalThis.setTimeout || ((fn: () => void, ms: number) => {
    const intervalId = setInterval(() => {
      fn()
      clearInterval(intervalId)
    }, ms)
    return Number(intervalId)
  })

  // Configurar console para testes
  const originalConsole = globalThis.console
  globalThis.console = {
    ...originalConsole,
    log: (..._args: any[]) => {
      if (Deno.env.get('TEST_VERBOSE') === 'true') {
        originalConsole.log(..._args)
      }
    },
    error: originalConsole.error,
    warn: originalConsole.warn,
    info: originalConsole.info
  }
}

// Limpeza após testes
export const cleanupTests = () => {
  // Limpar timers, conexões, etc.
  // Implementar conforme necessário
}

// Executar setup automaticamente
setupTests()

// Hooks para execução de testes
if (typeof Deno !== 'undefined') {
  // Hook para executar antes de todos os testes
  Deno.test({
    name: 'Setup - Initialize test environment',
    fn: async () => {
      console.log('🚀 Initializing Edge Functions test environment...')
      setupTests()
      console.log('✅ Test environment ready')
    },
    sanitizeOps: false,
    sanitizeResources: false
  })

  // Hook para executar após todos os testes
  globalThis.addEventListener('unload', () => {
    console.log('🧹 Cleaning up test environment...')
    cleanupTests()
    console.log('✅ Cleanup completed')
  })
}

// Exportar utilitários principais
export {
  assertEquals,
  assertExists,
  assertRejects
}