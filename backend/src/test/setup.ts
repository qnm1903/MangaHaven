import { vi } from 'vitest'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from parent .env file
dotenv.config({ path: resolve(__dirname, '../../.env') })

// Mock console.log and console.error
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}

// Setup global test environment
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
})
