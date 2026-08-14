export const mockSystemData = {
  vitals: {
    cpu_percent: 18.4,
    cpu_count: 12,
    memory: { percent: 42.1, available: '18.6 GiB' },
    disk: { percent: 31.8, free: '684 GiB' },
  },
  containers: {
    results: [
      { id: 'mock-memorygate', name: 'memorygate-api', image: 'memorygate/api:dev', status: 'running' },
      { id: 'mock-toolgate', name: 'toolgate-api', image: 'toolgate/api:dev', status: 'running' },
      { id: 'mock-agentgate', name: 'agentgate-api', image: 'agentgate/api:dev', status: 'running' },
    ],
  },
  backups: {
    latest: { name: '20260814T010000Z', path: '~/conker-backups/20260814T010000Z' },
  },
}
