import { useAtom } from 'jotai'
import { Settings as SettingsIcon, FileText, Scroll, ArrowUpDown, ArrowLeftRight, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { chapterLanguagesAtom, uiLanguageAtom, type UiLocale, SUPPORTED_LANGUAGES, type LanguageCode } from '@/store/settingsAtoms'
import useLocalStorage from '@/hooks/useLocalStorage'
import type { ReaderSettings } from '@/components/chapter/ReaderSettingsModal'
import { useToast } from '@/hooks/use_toast'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { LanguageFlag } from '@/components/LanguageFlag'

const Settings = () => {
  const [chapterLanguages, setChapterLanguages] = useAtom(chapterLanguagesAtom)
  const [uiLanguage, setUiLanguage] = useAtom(uiLanguageAtom)
  const [readerSettings, setReaderSettings] = useLocalStorage<ReaderSettings>('reader-settings', {
    readingMode: 'scroll-vertical',
    imageGap: 4,
    imageOrientation: 'vertical',
    showHeader: false,
  })
  const { toast } = useToast()

  const toggleLanguage = (code: LanguageCode) => {
    setChapterLanguages(prev => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev // must keep at least one
        return prev.filter(l => l !== code)
      }
      return [...prev, code]
    })
  }

  const handleReadingModeChange = (mode: 'scroll-vertical' | 'scroll-horizontal' | 'single-page') => {
    if (mode !== 'scroll-vertical') {
      toast({
        title: t`Feature in development`,
        description: t`This reading mode will be available soon.`,
        variant: 'default',
      });
      return
    }
    setReaderSettings({ ...readerSettings, readingMode: mode })
  }

  const handleOrientationChange = (orientation: 'vertical' | 'horizontal') => {
    setReaderSettings({ ...readerSettings, imageOrientation: orientation })
  }

  const handleShowHeaderChange = (show: boolean) => {
    setReaderSettings({ ...readerSettings, showHeader: show })
  }

  const handleImageGapChange = (gap: number) => {
    setReaderSettings({ ...readerSettings, imageGap: gap })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground"><Trans>Settings</Trans></h1>
          <p className="text-sm text-muted-foreground"><Trans>Customize your reading experience</Trans></p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <Trans>Chapter Language</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Default translation language for chapter lists and home page.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label><Trans>Chapter translation language</Trans></Label>
          <div className="flex flex-wrap gap-3">
            {SUPPORTED_LANGUAGES.map(lang => {
              const selected = chapterLanguages.includes(lang.code)
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted',
                  ].join(' ')}
                >
                  <img src={lang.flag} alt={lang.label} className="h-4 w-5 object-cover rounded-sm" />
                  {lang.nativeLabel}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground"><Trans>At least one language must be selected.</Trans></p>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <Trans>Reader Settings</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Customize your manga reading experience</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reading Mode */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground"><Trans>Reading Mode</Trans></Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={readerSettings.readingMode === 'single-page' ? 'default' : 'outline'}
                className={
                  readerSettings.readingMode === 'single-page'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground border-border hover:bg-slate-200 dark:hover:bg-secondary hover:text-foreground'
                }
                onClick={() => handleReadingModeChange('single-page')}
              >
                <FileText className="w-4 h-4 mr-2" />
                <Trans>Single Page</Trans>
              </Button>
              <Button
                variant={readerSettings.readingMode === 'scroll-vertical' ? 'default' : 'outline'}
                className={
                  readerSettings.readingMode === 'scroll-vertical'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground border-border hover:bg-slate-200 dark:hover:bg-secondary hover:text-foreground'
                }
                onClick={() => handleReadingModeChange('scroll-vertical')}
              >
                <Scroll className="w-4 h-4 mr-2" />
                <Trans>Vertical Scroll</Trans>
              </Button>
            </div>
          </div>

          {/* Image Gap */}
          <div className="space-y-3 w-full">
            <Label className="text-sm text-foreground"><Trans>Image gap (px)</Trans></Label>
            <Input
              type="number"
              value={readerSettings.imageGap}
              onChange={(e) => handleImageGapChange(Number(e.target.value))}
              className="w-full"
              min={0}
              max={50}
            />
          </div>

          {/* Image Orientation */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground"><Trans>Image Fit</Trans></Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={readerSettings.imageOrientation === 'vertical' ? 'default' : 'outline'}
                className={
                  readerSettings.imageOrientation === 'vertical'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground border-border hover:bg-slate-200 dark:hover:bg-secondary hover:text-foreground'
                }
                onClick={() => handleOrientationChange('vertical')}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <Trans>Fit Vertical</Trans>
              </Button>
              <Button
                variant={readerSettings.imageOrientation === 'horizontal' ? 'default' : 'outline'}
                className={
                  readerSettings.imageOrientation === 'horizontal'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground border-border hover:bg-slate-200 dark:hover:bg-secondary hover:text-foreground'
                }
                onClick={() => handleOrientationChange('horizontal')}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                <Trans>Fit Horizontal</Trans>
              </Button>
            </div>
          </div>

          {/* Show Header */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground"><Trans>Reader Header</Trans></Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={!readerSettings.showHeader ? 'default' : 'outline'}
                className={
                  !readerSettings.showHeader
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground border-border hover:bg-slate-200 dark:hover:bg-secondary hover:text-foreground'
                }
                onClick={() => handleShowHeaderChange(false)}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                <Trans>Hide</Trans>
              </Button>
              <Button
                variant={readerSettings.showHeader ? 'default' : 'outline'}
                className={
                  readerSettings.showHeader
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground border-border hover:bg-slate-200 dark:hover:bg-secondary hover:text-foreground'
                }
                onClick={() => handleShowHeaderChange(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                <Trans>Show</Trans>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <Trans>Interface Language</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Choose the display language for the application interface.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label><Trans>Language</Trans></Label>
          <div className="flex flex-wrap gap-3">
            {([
              { code: 'en' as UiLocale, nativeLabel: 'English' },
              { code: 'vi' as UiLocale, nativeLabel: 'Tiếng Việt' },
            ]).map(lang => {
              const selected = uiLanguage === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setUiLanguage(lang.code)}
                  className={[
                    'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2'
                      : 'bg-background text-foreground border-border hover:bg-muted',
                  ].join(' ')}
                  title={lang.nativeLabel}
                >
                  <LanguageFlag languageCode={lang.code} className="h-6 w-7" />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
