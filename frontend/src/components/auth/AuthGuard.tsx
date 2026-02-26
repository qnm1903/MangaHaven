import React from 'react'
import { Trans } from '@lingui/react/macro'
import { useAuth } from '@/hooks/useAuth'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  message?: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  message,
}) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="rounded-full bg-muted p-6 mb-6">
          <LogIn className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          <Trans>Sign in required</Trans>
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {message || <Trans>You need to sign in to access this page.</Trans>}
        </p>
        <Button asChild size="lg">
          <Link to="/auth">
            <LogIn className="mr-2 h-4 w-4" />
            <Trans>Sign In</Trans>
          </Link>
        </Button>
      </div>
    )
  }

  return <>{children}</>
}