import { useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import { AgentGateHeader } from './page-header'

type Character = { name: string; role: string; voice: string; operating_principle: string }
export function CharacterPage() {
  const query = useQuery({ queryKey: ['agentgate', 'character'], queryFn: () => getAgentGate<Character>('/api/character') })
  const character = query.data
  return <><AgentGateHeader /><Main className='max-w-4xl'><div className='mb-6'><h1 className='text-2xl font-bold tracking-tight'>Character</h1><p className='text-sm text-muted-foreground'>Set how your agent communicates and applies its standing judgment.</p></div><Card><CardHeader><CardTitle>Hermes character</CardTitle><CardDescription>These instructions guide style and reasoning; they do not grant new permissions.</CardDescription></CardHeader><CardContent><form className='space-y-5'><div className='space-y-2'><Label htmlFor='character-name'>Name</Label><Input id='character-name' defaultValue={character?.name} /></div><div className='space-y-2'><Label htmlFor='character-role'>Role</Label><Input id='character-role' defaultValue={character?.role} /></div><div className='space-y-2'><Label htmlFor='character-voice'>Voice</Label><Textarea id='character-voice' defaultValue={character?.voice} className='min-h-28' /></div><div className='space-y-2'><Label htmlFor='character-principle'>Operating principle</Label><Textarea id='character-principle' defaultValue={character?.operating_principle} className='min-h-28' /></div><div className='flex justify-end'><Button type='submit'><Save />Save character</Button></div></form></CardContent></Card></Main></>
}
