import { useMemo, useState, type DragEvent } from 'react'
import { ExternalLink, FileCode2, Link2, RotateCcw, Upload } from 'lucide-react'
import {
  parseThemeInput,
  tokenCount,
  type ThemeTokens,
} from '@/lib/theme-import'
import { useTheme } from '@/context/theme-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const TWEAKCN_URL = 'https://tweakcn.com/'
const DEFAULT_TWEAKCN_PALETTE = 'https://tweakcn.com/r/themes/darkmatter.json'

function colorInputValue(value: string | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#50a8ff'
}

export function ThemeStudio() {
  const {
    resolvedTheme,
    customTheme,
    setCustomTheme,
    previewCustomTheme,
    resetCustomTheme,
  } = useTheme()
  const [source, setSource] = useState('')
  const [paletteUrl, setPaletteUrl] = useState(DEFAULT_TWEAKCN_PALETTE)
  const [draft, setDraft] = useState<ThemeTokens>(
    customTheme ?? { light: {}, dark: {} }
  )
  const [status, setStatus] = useState('')
  const count = useMemo(() => tokenCount(draft), [draft])

  const updateDraft = (tokens: ThemeTokens, message: string) => {
    setDraft(tokens)
    previewCustomTheme(tokens)
    setStatus(message)
  }

  const importText = (value: string, label: string) => {
    const tokens = parseThemeInput(value)
    if (!tokenCount(tokens)) {
      setStatus(`Could not find supported shadcn tokens in ${label}.`)
      return
    }
    updateDraft(
      tokens,
      `${tokenCount(tokens)} theme tokens imported from ${label}.`
    )
  }

  const importUrl = async () => {
    setStatus('Loading palette…')
    try {
      const url = new URL(paletteUrl)
      if (
        url.protocol !== 'https:' ||
        (url.hostname !== 'tweakcn.com' &&
          !url.hostname.endsWith('.tweakcn.com'))
      ) {
        throw new Error('Only HTTPS tweakcn palette URLs are supported.')
      }
      const response = await fetch(url, {
        credentials: 'omit',
        redirect: 'error',
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      importText(await response.text(), 'tweakcn')
    } catch {
      setStatus(
        'Palette could not be loaded. Check the URL or use paste instead.'
      )
    }
  }

  const chooseFile = async (file?: File) => {
    if (!file) return
    importText(await file.text(), file.name)
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    void chooseFile(event.dataTransfer.files[0])
  }

  const setAccent = (value: string) => {
    const next = { light: { ...draft.light }, dark: { ...draft.dark } }
    for (const mode of ['light', 'dark'] as const) {
      next[mode].primary = value
      next[mode].ring = value
      next[mode]['sidebar-primary'] = value
      next[mode]['sidebar-ring'] = value
      next[mode].accent = value
    }
    updateDraft(next, 'Accent preview applied.')
  }

  const reset = () => {
    resetCustomTheme()
    setDraft({ light: {}, dark: {} })
    setSource('')
    setStatus('AgentGate defaults restored.')
  }

  return (
    <div className='grid w-full max-w-[1500px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]'>
      <Card className='h-fit'>
        <CardHeader className='space-y-4'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <CardTitle>Theme Studio</CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                Import a shadcn theme. No manual token maze.
              </p>
            </div>
            <Badge variant={count ? 'secondary' : 'outline'}>
              {count ? `${count} tokens` : 'AgentGate default'}
            </Badge>
          </div>
          <Button asChild variant='outline' className='w-full justify-between'>
            <a href={TWEAKCN_URL} target='_blank' rel='noreferrer'>
              Open tweakcn
              <ExternalLink className='size-4' />
            </a>
          </Button>
        </CardHeader>
        <CardContent className='grid gap-5'>
          <div className='grid gap-2'>
            <Label htmlFor='theme-palette-url'>
              Import tweakcn palette URL
            </Label>
            <div className='flex gap-2'>
              <Input
                id='theme-palette-url'
                value={paletteUrl}
                onChange={(e) => setPaletteUrl(e.target.value)}
              />
              <Button
                type='button'
                variant='secondary'
                onClick={() => void importUrl()}
                aria-label='Import palette URL'
              >
                <Link2 className='size-4' />
              </Button>
            </div>
          </div>
          <Separator />
          <div className='grid gap-2'>
            <Label>Drop a styles.css or layout.tsx</Label>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              htmlFor='theme-file'
              className='flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/50'
            >
              <Upload className='size-4' />
              <span>Choose file or drop here</span>
              <Input
                id='theme-file'
                type='file'
                accept='.css,.tsx,.ts,.json,text/css,text/plain,application/json'
                className='sr-only'
                onChange={(e) => void chooseFile(e.target.files?.[0])}
              />
            </label>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='theme-source'>Paste styles.css or layout.tsx</Label>
            <Textarea
              id='theme-source'
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder='Paste tweakcn export here…'
              className='min-h-44 font-mono text-xs'
            />
            <Button
              type='button'
              variant='secondary'
              onClick={() => importText(source, 'pasted code')}
            >
              <FileCode2 className='size-4' />
              Preview changes
            </Button>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='accent-color'>Accent color</Label>
            <div className='flex items-center gap-2'>
              <Input
                id='accent-color'
                type='color'
                className='h-10 w-14 cursor-pointer p-1'
                value={colorInputValue(draft[resolvedTheme].primary)}
                onChange={(e) => setAccent(e.target.value)}
              />
              <span className='font-mono text-xs text-muted-foreground'>
                {draft[resolvedTheme].primary ?? '#50a8ff'}
              </span>
            </div>
          </div>
          {status ? (
            <p role='status' className='text-xs text-muted-foreground'>
              {status}
            </p>
          ) : null}
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              onClick={() => {
                setCustomTheme(draft)
                setStatus('Theme applied to AgentGate.')
              }}
            >
              Apply theme
            </Button>
            <Button type='button' variant='outline' onClick={reset}>
              <RotateCcw className='size-4' />
              Reset theme
            </Button>
          </div>
        </CardContent>
      </Card>
      <ThemePreview />
    </div>
  )
}

function ThemePreview() {
  return (
    <Card className='min-h-[620px]'>
      <CardHeader className='flex-row items-center justify-between space-y-0 border-b'>
        <div>
          <CardTitle>Live preview</CardTitle>
          <p className='mt-1 text-sm text-muted-foreground'>
            Real shadcn components from AgentGate.
          </p>
        </div>
        <Badge>Preview</Badge>
      </CardHeader>
      <CardContent className='grid gap-5 p-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Project overview</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>
                Theme source
              </span>
              <Badge variant='secondary'>shadcn tokens</Badge>
            </div>
            <div className='h-2 rounded-full bg-muted'>
              <div className='h-2 w-2/3 rounded-full bg-primary' />
            </div>
            <div className='flex gap-2'>
              <Button size='sm'>Primary</Button>
              <Button size='sm' variant='outline'>
                Secondary
              </Button>
              <Button size='sm' variant='ghost'>
                Ghost
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Configuration</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <Label htmlFor='preview-input'>Workspace name</Label>
            <Input id='preview-input' placeholder='AgentGate' />
            <div className='flex items-center gap-2'>
              <Badge variant='outline'>Draft</Badge>
              <span className='text-sm text-muted-foreground'>
                Changes stay local until applied.
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-base'>Token behavior</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-3 text-sm text-muted-foreground sm:grid-cols-3'>
            <div>
              <strong className='block text-foreground'>Color</strong>Primary,
              accent, ring, sidebar
            </div>
            <div>
              <strong className='block text-foreground'>Shape</strong>Radius
              comes from the imported theme
            </div>
            <div>
              <strong className='block text-foreground'>Typography</strong>Sans
              and mono tokens are supported
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
