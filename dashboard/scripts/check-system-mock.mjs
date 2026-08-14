import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/mockData.ts', import.meta.url), 'utf8')
const runnable = source.replace('export const mockSystemData =', 'globalThis.mockSystemData =')
const context = {}
vm.createContext(context)
vm.runInContext(runnable, context)

const data = context.mockSystemData
if (typeof data?.vitals?.cpu_percent !== 'number') throw new Error('Missing mock CPU percent')
if (!Array.isArray(data?.containers?.results)) throw new Error('Missing mock container results')
if (!data?.backups?.latest?.name) throw new Error('Missing mock latest backup')

console.log('system mock renders expected data shape')
