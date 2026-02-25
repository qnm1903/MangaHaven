import { useState, useRef, useEffect, useCallback } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { Camera, User, Lock, Calendar, X } from 'lucide-react'
import { userService, type UserProfile, type UpdateProfileData } from '../services/user_service'
import { useToast } from '../hooks/use_sonner_toast'
import { useAuth } from '../hooks/useAuth'
import { useSetAtom } from 'jotai'
import { updateUserAtom } from '../store/authAtoms'


interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth()
  const { success, error } = useToast()
  const updateUser = useSetAtom(updateUserAtom)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef(error) // Stable reference for error function

  // Update error ref when error function changes
  useEffect(() => {
    errorRef.current = error
  }, [error])

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const [editedProfile, setEditedProfile] = useState<Partial<UpdateProfileData>>({})
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  const loadProfile = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const profileData = await userService.getProfile()
      setProfile(profileData)
      setEditedProfile({
        displayName: profileData.displayName,
        email: profileData.email,
        timezone: profileData.timezone
      })
    } catch (err) {
      console.error('Error loading profile:', err)
      errorRef.current(t`Could not load profile information`)
    } finally {
      setIsLoading(false)
    }
  }, [user]) // Now properly isolated from error function

  useEffect(() => {
    if (!authLoading && user) {
      loadProfile()
    }
  }, [loadProfile, authLoading, user]) // Now safe to include loadProfile

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const updatedProfile = await userService.updateProfile(editedProfile)
      setProfile(updatedProfile)
      setIsEditing(false)
      success(t`Profile updated successfully!`)
    } catch (err) {
      console.error('Error updating profile:', err)
      error(t`Failed to update profile`)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      error(t`Passwords do not match`)
      return
    }

    if (passwordData.newPassword.length < 6) {
      error(t`New password must be at least 6 characters`)
      return
    }

    try {
      setIsChangingPassword(true)
      await userService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      })
      success(t`Password changed successfully!`)
    } catch (err) {
      console.error('Error changing password:', err)
      error(t`Failed to change password. Please check your current password.`)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    try {
      setIsUploadingAvatar(true)
      const updatedProfile = await userService.uploadAvatar(file)
      setProfile(updatedProfile)
      // Sync auth atom so Header reflects the new avatar — update in-place to avoid re-triggering loadProfile
      if (user) {
        updateUser({ ...user, profilePicture: updatedProfile.avatarUrl, avatarUrl: updatedProfile.avatarUrl })
      }
      success(t`Avatar updated successfully!`)
    } catch (err) {
      console.error('Error uploading avatar:', err)
      error(t`Failed to upload avatar`)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true)
      const updatedProfile = await userService.removeAvatar()
      setProfile(updatedProfile)
      // Sync auth atom so Header reflects the removal — update in-place to avoid re-triggering loadProfile
      if (user) {
        updateUser({ ...user, profilePicture: updatedProfile.avatarUrl, avatarUrl: updatedProfile.avatarUrl })
      }
      success(t`Avatar removed successfully!`)
    } catch (err) {
      console.error('Error removing avatar:', err)
      error(t`Failed to remove avatar`)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error(t`Please select an image file`)
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      error(t`File size must not exceed 5MB`)
      return
    }

    handleAvatarUpload(file)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const displayName = profile?.displayName || t`User`

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            <Trans>Please sign in to view your profile</Trans>
          </h1>
          <Button onClick={() => window.location.href = '/auth'}>
            <Trans>Sign In</Trans>
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            <Trans>Could not load profile</Trans>
          </h1>
          <Button onClick={loadProfile}><Trans>Retry</Trans></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            <Trans>My Profile</Trans>
          </h1>
          <p className="text-muted-foreground">
            <Trans>Manage your personal information and account settings</Trans>
          </p>
        </div>

        {/* Profile Overview Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={profile.avatarUrl || '/default-avatar.svg'}
                    alt={displayName}
                  />
                  <AvatarFallback className="text-lg">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* Avatar upload button */}
                <div className="absolute -bottom-2 -right-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 rounded-full bg-background border-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-foreground">
                  {displayName}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {profile.email}
                </p>
                <div className="flex items-center justify-center sm:justify-start space-x-4 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    <Trans>Joined {formatDate(profile.createdAt)}</Trans>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {profile.role}
                  </Badge>
                </div>
              </div>

              {/* Avatar Actions */}
              {profile.avatarUrl && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                  >
                    <X className="h-4 w-4 mr-1" />
                    <Trans>Remove avatar</Trans>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span><Trans>Personal Information</Trans></span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span><Trans>Security</Trans></span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle><Trans>Personal Information</Trans></CardTitle>
                <CardDescription>
                  <Trans>Update your personal details</Trans>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="displayName"><Trans>Display Name</Trans></Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      type="text"
                      value={isEditing ? (editedProfile.displayName || '') : (profile.displayName || '')}
                      onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                      disabled={!isEditing}
                      placeholder={t`Enter display name`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email"><Trans>Email</Trans></Label>
                    <Input
                      id="email"
                      type="email"
                      value={isEditing ? (editedProfile.email || '') : profile.email}
                      onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                      disabled={!isEditing}
                      placeholder={t`Enter email address`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone"><Trans>Timezone</Trans></Label>
                    <Input
                      id="timezone"
                      value={isEditing ? (editedProfile.timezone || '') : profile.timezone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, timezone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="VD: Asia/Ho_Chi_Minh"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role"><Trans>Role</Trans></Label>
                    <Input
                      id="role"
                      value={profile.role}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground"><Trans>Role cannot be changed</Trans></p>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end space-x-4">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false)
                          setEditedProfile({
                            displayName: profile.displayName,
                            email: profile.email,
                            timezone: profile.timezone
                          })
                        }}
                        disabled={isSaving}
                      >
                        <Trans>Cancel</Trans>
                      </Button>
                      <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            <Trans>Saving...</Trans>
                          </>
                        ) : (
                          <Trans>Save Changes</Trans>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      <Trans>Edit Profile</Trans>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle><Trans>Account Security</Trans></CardTitle>
                <CardDescription>
                  <Trans>Change your password to protect your account</Trans>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword"><Trans>Current Password</Trans></Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder={t`Enter current password`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword"><Trans>New Password</Trans></Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder={t`Enter new password (at least 6 characters)`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword"><Trans>Confirm New Password</Trans></Label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      value={passwordData.confirmNewPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                      placeholder={t`Re-enter new password`}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmNewPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <Trans>Changing...</Trans>
                      </>
                    ) : (
                      <Trans>Change Password</Trans>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Hidden file input for avatar upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          title="Upload avatar image"
          aria-label="Upload avatar image"
          id="avatar-upload-input"
        />
      </div>
    </div>
  )
}

export default Profile