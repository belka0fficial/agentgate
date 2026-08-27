export type ConkerEmotion = 'neutral' | 'annoyed' | 'smug' | 'focused'

export const conkerEmotionPack = [
  { id: 'neutral', label: 'Neutral', asset: 'conker-head-neutral' },
  { id: 'annoyed', label: 'Annoyed', asset: 'conker-head-annoyed' },
  { id: 'smug', label: 'Smug', asset: 'conker-head-smug' },
  { id: 'focused', label: 'Focused', asset: 'conker-head-focused' },
] as const
