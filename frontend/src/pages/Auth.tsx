import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { GoogleLogin } from '@react-oauth/google'
import type { CredentialResponse } from '@react-oauth/google'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use_toast"
import { AuthService } from "@/services/auth_service"
import { BookOpen, Mail, Lock, User, Eye, EyeOff } from "lucide-react"
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { login, googleAuth } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast({
        variant: "destructive",
        title: t`Login Error`,
        description: t`No credential received from Google.`,
      })
      return
    }

    setIsLoading(true)
    try {
      await googleAuth(credentialResponse.credential)
      navigate({ to: '/' })
      toast({
        title: t`Welcome!`,
        description: t`Successfully signed in with Google.`,
        duration: 3000,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t`Google login failed. Please try again.`
      toast({
        variant: "destructive",
        title: t`Google Login Error`,
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    toast({
      variant: "destructive",
      title: t`Google Login Error`,
      description: t`Login was interrupted. Please try again.`,
      duration: 5000,
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = t`Email is required`
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t`Email is invalid`
    }

    if (!formData.password) {
      newErrors.password = t`Password is required`
    } else if (formData.password.length < 6) {
      newErrors.password = t`Password must be at least 6 characters`
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = t`Name is required`
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = t`Please confirm your password`
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t`Passwords do not match`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (isLogin) {
        const response = await AuthService.login({
          email: formData.email,
          password: formData.password
        })
        login(response.data.accessToken, response.data.user)
      } else {
        const response = await AuthService.register({
          displayName: formData.name,
          email: formData.email,
          password: formData.password
        })
        login(response.data.accessToken, response.data.user)
      }

      navigate({ to: '/' })
      toast({
        title: t`Welcome!`,
        description: isLogin ? t`Successfully signed in!` : t`Account created successfully!`,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t`Authentication failed. Please try again.`
      toast({
        variant: "destructive",
        title: t`Authentication Error`,
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f12] px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
              <BookOpen className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">MangaVerse</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {isLogin ? <Trans>Welcome back</Trans> : <Trans>Create your account</Trans>}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-8">
          {/* Toggle */}
          <div className="flex bg-zinc-900 rounded-lg p-1 mb-8">
            <button
              type="button"
              title="Switch to sign in"
              aria-label="Switch to sign in"
              className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-all duration-200 ${isLogin
                ? 'bg-violet-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
              onClick={() => setIsLogin(true)}
            >
              <Trans>Sign In</Trans>
            </button>
            <button
              type="button"
              title="Switch to sign up"
              aria-label="Switch to sign up"
              className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-all duration-200 ${!isLogin
                ? 'bg-violet-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
              onClick={() => setIsLogin(false)}
            >
              <Trans>Sign Up</Trans>
            </button>
          </div>

          {/* Google Sign In */}
          <div className="mb-6">
            <div className="w-full flex justify-center [&>div]:w-full [&_iframe]:!w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                size="large"
                width="340"
                text="continue_with"
                shape="rectangular"
                logo_alignment="left"
                theme="filled_black"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#18181b] px-3 text-zinc-500"><Trans>or continue with email</Trans></span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field (Sign Up only) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300 text-sm"><Trans>Full Name</Trans></Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder={t`Enter your name`}
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`pl-11 h-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors ${errors.name ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300 text-sm"><Trans>Email</Trans></Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`pl-11 h-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300 text-sm"><Trans>Password</Trans></Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`pl-11 pr-11 h-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  title={showPassword ? t`Hide password` : t`Show password`}
                  aria-label={showPassword ? t`Hide password` : t`Show password`}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs">{errors.password}</p>}
            </div>

            {/* Confirm Password (Sign Up only) */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-300 text-sm"><Trans>Confirm Password</Trans></Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`pl-11 h-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-xs">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-violet-500 hover:bg-violet-600 text-white font-medium transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? <Trans>Signing in...</Trans> : <Trans>Creating account...</Trans>}
                </div>
              ) : (
                isLogin ? <Trans>Sign In</Trans> : <Trans>Create Account</Trans>
              )}
            </Button>
          </form>

          {/* Forgot Password */}
          {isLogin && (
            <div className="text-center mt-5">
              <button
                type="button"
                title="Reset your password"
                aria-label="Reset your password"
                className="text-sm text-zinc-500 hover:text-violet-400 transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          <Trans>By continuing, you agree to our{' '}
          <a href="#" title="Terms of Service" className="text-zinc-400 hover:text-violet-400 transition-colors">
            Terms
          </a>
          {' '}and{' '}
          <a href="#" title="Privacy Policy" className="text-zinc-400 hover:text-violet-400 transition-colors">
            Privacy Policy
          </a></Trans>
        </p>
      </div>
    </div>
  )
}

export default Auth