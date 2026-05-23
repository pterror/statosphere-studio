import type { ConfigTree } from '../stores/config'
import type { LintResult } from './index'

export function imageToImageTypo(config: ConfigTree): LintResult[] {
  const results: LintResult[] = []
  for (let i = 0; i < config.generators.length; i++) {
    const gen = config.generators[i]
    if (gen.type === 'Image-to-Image' && gen.imageToImageType !== undefined) {
      results.push({
        id: 'image-to-image-typo',
        severity: 'warn',
        section: 'generators',
        elementIndex: i,
        field: 'imageToImageType',
        message:
          'The runtime reads "iamgeToImageType" (misspelled), so "imageToImageType" has no effect — auto-fix renames the key in the raw JSON, but the UI will still show the corrected field.',
        learnMore:
          'https://docs.rhi.zone/statosphere-guide/reference/gotchas#the-imagetoimagetype-typo',
        autoFix: (c: ConfigTree): ConfigTree => {
          const generators = c.generators.map((g, idx) => {
            if (idx !== i) return g
            const { imageToImageType, ...rest } = g
            return { ...rest, iamgeToImageType: imageToImageType } as typeof g
          })
          return { ...c, generators }
        },
      })
    }
  }
  return results
}
