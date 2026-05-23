import type { ConfigTree } from '../stores/config'
import { imageToImageTypo } from './image-to-image-typo'
import { replaceBug } from './replace-bug'
import { initializationPhase } from './initialization-phase'
import { undeclaredVariable } from './undeclared-variable'
import { innerQuoteMismatch } from './inner-quote-mismatch'
import { singletonCategory } from './singleton-category'

export interface LintResult {
  id: string
  severity: 'warn' | 'info'
  section: 'variables' | 'functions' | 'classifiers' | 'generators' | 'contentRules'
  elementIndex: number
  field?: string
  message: string
  learnMore: string
  autoFix?: (config: ConfigTree) => ConfigTree
}

const rules: Array<(config: ConfigTree) => LintResult[]> = [
  imageToImageTypo,
  replaceBug,
  initializationPhase,
  undeclaredVariable,
  innerQuoteMismatch,
  singletonCategory,
]

export function runLints(config: ConfigTree): LintResult[] {
  return rules.flatMap((rule) => rule(config))
}
