import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { GoogleOAuthService } from '../services/google_oauth_service'
import { OAuth2Client } from 'google-auth-library'

// Setup environment variables for testing
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'

// Mock Google Auth Library
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(() => ({
    verifyIdToken: vi.fn(),
  })),
}))

// Mock Prisma Client
vi.mock('../db/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    oAuthProvider: {
      create: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
  },
}))

// Mock JWT utilities
vi.mock('../utils/jwt', () => ({
  JWTUtils: {
    generateAccessToken: vi.fn(() => 'mock-access-token'),
    generateRefreshToken: vi.fn(() => 'mock-refresh-token'),
    getExpirationTime: vi.fn(() => Math.floor(Date.now() / 1000) + 3600),
  },
}))

// Mock validation utilities
vi.mock('../utils/validation', () => ({
  ValidationUtils: {
    validateEmail: vi.fn(() => true),
  },
}))

// Mock fetch for Google API calls
global.fetch = vi.fn()

describe('GoogleOAuthService', () => {
  let mockOAuth2Client: any
  let mockPrisma: any

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup mock instances
    mockOAuth2Client = {
      verifyIdToken: vi.fn(),
    }

    // Mock constructor returns
    vi.mocked(OAuth2Client).mockReturnValue(mockOAuth2Client)

    // Reset fetch mock
    vi.mocked(fetch).mockReset()

    // Get prisma mock
    const prismaMock = await import('../db/prisma.js')
    mockPrisma = prismaMock.default
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('verifyGoogleToken (ID Token)', () => {
    test('should verify valid ID token successfully', async () => {
      // Arrange
      const mockIdToken = 'valid-id-token'
      const mockPayload = {
        sub: '123456789',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        email_verified: true,
        given_name: 'Test',
        family_name: 'User',
      }

      const mockTicket = {
        getPayload: () => mockPayload,
      }

      mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket)

      // Act
      const result = await GoogleOAuthService.verifyGoogleToken(mockIdToken)

      // Assert
      expect(result).toEqual({
        sub: '123456789',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        email_verified: true,
        given_name: 'Test',
        family_name: 'User',
      })
      expect(mockOAuth2Client.verifyIdToken).toHaveBeenCalledWith({
        idToken: mockIdToken,
        audience: 'test-google-client-id',
      })
    })

    test('should throw error for invalid ID token', async () => {
      // Arrange
      const invalidToken = 'invalid-token'
      mockOAuth2Client.verifyIdToken.mockRejectedValue(new Error('Invalid token'))

      // Act & Assert
      await expect(GoogleOAuthService.verifyGoogleToken(invalidToken))
        .rejects.toThrow('Invalid Google token')
    })

    test('should throw error when payload is null', async () => {
      // Arrange
      const mockIdToken = 'valid-token'
      const mockTicket = {
        getPayload: () => null,
      }

      mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket)

      // Act & Assert
      await expect(GoogleOAuthService.verifyGoogleToken(mockIdToken))
        .rejects.toThrow('Invalid Google token')
    })
  })

  describe('authenticateWithGoogle (Access Token)', () => {
    test('should create new user for new email', async () => {
      // Arrange
      const mockAccessToken = 'valid-access-token'
      const mockGoogleUser = {
        sub: '123456789',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/avatar.jpg',
        verified_email: true,
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGoogleUser),
      } as Response)

      mockPrisma.user.findUnique.mockResolvedValue(null) // User doesn't exist
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        displayName: 'New User',
        role: 'USER',
        timezone: 'UTC',
        profilePicture: 'https://example.com/avatar.jpg',
        emailVerified: true,
        isActive: true,
        googleId: '123456789',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await GoogleOAuthService.authenticateWithGoogle(mockAccessToken)

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
        select: expect.any(Object)
      })
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          displayName: 'New User',
          profilePicture: 'https://example.com/avatar.jpg',
          emailVerified: true,
          isActive: true,
          role: 'USER',
          googleId: '123456789',
          passwordHash: null,
        }),
        select: expect.any(Object)
      })
      expect(mockPrisma.oAuthProvider.create).toHaveBeenCalledWith({
        data: {
          provider: 'google',
          providerId: '123456789',
          userId: 'new-user-id',
        }
      })
      expect(result.user.email).toBe('newuser@example.com')
      expect(result.user.displayName).toBe('New User')
    })

    test('should login existing user with same email', async () => {
      // Arrange
      const mockAccessToken = 'valid-access-token'
      const mockGoogleUser = {
        sub: '123456789',
        email: 'existing@example.com',
        name: 'Updated Name',
        picture: 'https://example.com/new-avatar.jpg',
        verified_email: true,
      }

      const existingUser = {
        id: 'existing-user-id',
        email: 'existing@example.com',
        displayName: 'Original Name',
        role: 'USER',
        timezone: 'UTC',
        profilePicture: 'https://example.com/old-avatar.jpg',
        emailVerified: true,
        isActive: true,
        googleId: null, // No Google ID initially
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedUser = {
        ...existingUser,
        profilePicture: 'https://example.com/new-avatar.jpg',
        googleId: '123456789',
        lastLoginAt: new Date(),
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGoogleUser),
      } as Response)

      mockPrisma.user.findUnique.mockResolvedValue(existingUser)
      mockPrisma.user.update.mockResolvedValue(updatedUser)
      mockPrisma.oAuthProvider.findFirst.mockResolvedValue(null) // No existing OAuth provider

      // Act
      const result = await GoogleOAuthService.authenticateWithGoogle(mockAccessToken)

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
        select: expect.any(Object)
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'existing-user-id' },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
          googleId: '123456789',
          profilePicture: 'https://example.com/new-avatar.jpg',
          // displayName is NOT updated because user already has a non-default name
        }),
        select: expect.any(Object)
      })
      expect(mockPrisma.oAuthProvider.create).toHaveBeenCalledWith({
        data: {
          provider: 'google',
          providerId: '123456789',
          userId: 'existing-user-id',
        }
      })
      expect(result.user.email).toBe('existing@example.com')
      expect(result.user.id).toBe('existing-user-id')
    })

    test('should update display name when existing user has default name', async () => {
      // Arrange
      const mockAccessToken = 'valid-access-token'
      const mockGoogleUser = {
        sub: '123456789',
        email: 'existing@example.com',
        name: 'New Display Name',
        picture: 'https://example.com/avatar.jpg',
        verified_email: true,
      }

      const existingUser = {
        id: 'existing-user-id',
        email: 'existing@example.com',
        displayName: 'Google User',
        role: 'USER',
        timezone: 'UTC',
        profilePicture: null,
        emailVerified: true,
        isActive: true,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedUser = {
        ...existingUser,
        displayName: 'New Display Name',
        profilePicture: 'https://example.com/avatar.jpg',
        googleId: '123456789',
        lastLoginAt: new Date(),
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGoogleUser),
      } as Response)

      mockPrisma.user.findUnique.mockResolvedValue(existingUser)
      mockPrisma.user.update.mockResolvedValue(updatedUser)
      mockPrisma.oAuthProvider.findFirst.mockResolvedValue(null)

      // Act
      const result = await GoogleOAuthService.authenticateWithGoogle(mockAccessToken)

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'existing-user-id' },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
          googleId: '123456789',
          profilePicture: 'https://example.com/avatar.jpg',
          displayName: 'New Display Name', // Should be updated because existing was "Google User"
        }),
        select: expect.any(Object)
      })
      expect(result.user.email).toBe('existing@example.com')
      expect(result.user.id).toBe('existing-user-id')
    })

    test('should not create duplicate OAuth provider record', async () => {
      // Arrange
      const mockAccessToken = 'valid-access-token'
      const mockGoogleUser = {
        sub: '123456789',
        email: 'existing@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        verified_email: true,
      }

      const existingUser = {
        id: 'existing-user-id',
        email: 'existing@example.com',
        displayName: 'Test User',
        role: 'USER',
        timezone: 'UTC',
        profilePicture: 'https://example.com/avatar.jpg',
        emailVerified: true,
        isActive: true,
        googleId: '123456789',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const existingOAuthProvider = {
        id: 'provider-id',
        provider: 'google',
        providerId: '123456789',
        userId: 'existing-user-id',
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGoogleUser),
      } as Response)

      mockPrisma.user.findUnique.mockResolvedValue(existingUser)
      mockPrisma.user.update.mockResolvedValue(existingUser)
      mockPrisma.oAuthProvider.findFirst.mockResolvedValue(existingOAuthProvider)

      // Act
      await GoogleOAuthService.authenticateWithGoogle(mockAccessToken)

      // Assert
      expect(mockPrisma.oAuthProvider.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'existing-user-id',
          provider: 'google'
        }
      })
      expect(mockPrisma.oAuthProvider.create).not.toHaveBeenCalled() // Should not create duplicate
    })

    test('should reject invalid Google API response', async () => {
      // Arrange
      const mockAccessToken = 'invalid-access-token'

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid token'),
      } as Response)

      // Act & Assert
      await expect(GoogleOAuthService.authenticateWithGoogle(mockAccessToken))
        .rejects.toThrow('Invalid Google access token: 401 Invalid token')
    })

    test('should reject user without email', async () => {
      // Arrange
      const mockAccessToken = 'valid-access-token'
      const mockGoogleUser = {
        sub: '123456789',
        name: 'Test User',
        // No email provided
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGoogleUser),
      } as Response)

      // Act & Assert
      await expect(GoogleOAuthService.authenticateWithGoogle(mockAccessToken))
        .rejects.toThrow('Email not provided by Google')
    })

    test('should reject deactivated user account', async () => {
      // Arrange
      const mockAccessToken = 'valid-access-token'
      const mockGoogleUser = {
        sub: '123456789',
        email: 'deactivated@example.com',
        name: 'Deactivated User',
        verified_email: true,
      }

      const deactivatedUser = {
        id: 'deactivated-user-id',
        email: 'deactivated@example.com',
        displayName: 'Deactivated User',
        role: 'USER',
        timezone: 'UTC',
        isActive: false, // Deactivated account
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGoogleUser),
      } as Response)

      mockPrisma.user.findUnique.mockResolvedValue(deactivatedUser)
      mockPrisma.user.update.mockResolvedValue(deactivatedUser)

      // Act & Assert
      await expect(GoogleOAuthService.authenticateWithGoogle(mockAccessToken))
        .rejects.toThrow('Account is deactivated')
    })
  })

  describe('authenticateWithIdToken', () => {
    test('should create new user for new email with ID token', async () => {
      // Arrange
      const mockIdToken = 'valid-id-token'
      const mockGoogleUser = {
        sub: '123456789',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/avatar.jpg',
        email_verified: true,
        given_name: 'New',
        family_name: 'User',
      }

      const mockUser = {
        id: 'user-id-1',
        email: 'newuser@example.com',
        passwordHash: null,
        displayName: 'New User',
        role: 'USER' as const,
        avatarPublicId: null,
        profilePicture: 'https://example.com/avatar.jpg',
        emailVerified: true,
        isActive: true,
        timezone: 'UTC',
        lastLoginAt: null,
        googleId: '123456789',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockTicket = {
        getPayload: () => mockGoogleUser,
      }

      mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket)
      mockPrisma.user.findUnique.mockResolvedValue(null) // User doesn't exist
      mockPrisma.user.create.mockResolvedValue(mockUser)
      mockPrisma.oAuthProvider.create.mockResolvedValue({
        id: 'oauth-id-1',
        provider: 'google',
        providerId: '123456789',
        userId: 'user-id-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'refresh-id-1',
        token: 'mock-refresh-token',
        userId: 'user-id-1',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await GoogleOAuthService.authenticateWithIdToken(mockIdToken)

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
        select: expect.any(Object)
      })
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          displayName: 'New User',
          profilePicture: 'https://example.com/avatar.jpg',
          emailVerified: true,
          isActive: true,
          role: 'USER',
          googleId: '123456789',
          passwordHash: null,
        }),
        select: expect.any(Object)
      })
      expect(result.user.email).toBe('newuser@example.com')
      expect(result.user.displayName).toBe('New User')
    })

    test('should login existing user with same email using ID token', async () => {
      // Arrange
      const mockIdToken = 'valid-id-token'
      const mockGoogleUser = {
        sub: '123456789',
        email: 'existing@example.com',
        name: 'Updated Name',
        picture: 'https://example.com/new-avatar.jpg',
        email_verified: true,
        given_name: 'Updated',
        family_name: 'Name',
      }

      const existingUser = {
        id: 'existing-user-id',
        email: 'existing@example.com',
        displayName: 'Original Name', // Existing display name - won't be updated
        role: 'USER',
        timezone: 'UTC',
        profilePicture: 'https://example.com/old-avatar.jpg',
        emailVerified: true,
        isActive: true,
        googleId: null, // No Google ID initially
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedUser = {
        ...existingUser,
        profilePicture: 'https://example.com/new-avatar.jpg',
        googleId: '123456789',
        lastLoginAt: new Date(),
      }

      const mockTicket = {
        getPayload: () => mockGoogleUser,
      }

      mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket)
      mockPrisma.user.findUnique.mockResolvedValue(existingUser)
      mockPrisma.user.update.mockResolvedValue(updatedUser)
      mockPrisma.oAuthProvider.findFirst.mockResolvedValue(null) // No existing OAuth provider

      // Act
      const result = await GoogleOAuthService.authenticateWithIdToken(mockIdToken)

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'existing-user-id' },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
          googleId: '123456789',
          profilePicture: 'https://example.com/new-avatar.jpg',
          // displayName is NOT updated because user already has a non-default name
        }),
        select: expect.any(Object)
      })
      expect(result.user.email).toBe('existing@example.com')
      expect(result.user.id).toBe('existing-user-id')
    })

    test('should throw error for unverified email', async () => {
      // Arrange
      const mockIdToken = 'valid-id-token'
      const mockGoogleUser = {
        sub: '123456789',
        email: 'test@example.com',
        name: 'Test User',
        email_verified: false, // Email not verified
        given_name: 'Test',
        family_name: 'User',
      }

      const mockTicket = {
        getPayload: () => mockGoogleUser,
      }

      mockOAuth2Client.verifyIdToken.mockResolvedValue(mockTicket)

      // Act & Assert
      await expect(GoogleOAuthService.authenticateWithIdToken(mockIdToken))
        .rejects.toThrow('Google email not verified')
    })
  })

  describe('Environment Configuration', () => {
    test('should use correct Google Client ID from environment', () => {
      expect(process.env.GOOGLE_CLIENT_ID).toBeDefined()
      expect(process.env.GOOGLE_CLIENT_ID).toBe('test-google-client-id')
    })
  })
})
