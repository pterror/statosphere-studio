import type { RecipeDef } from '../../types'
import varCounter from './var-counter'
import varState from './var-state'
import varFlag from './var-flag'
import classifierEventDetect from './classifier-event-detect'
import classifierMultiEvent from './classifier-multi-event'
import classifierDynamicLabel from './classifier-dynamic-label'
import generatorText from './generator-text'
import generatorImage from './generator-image'
import ruleStageDireciton from './rule-stage-direction'
import ruleStatusLine from './rule-status-line'

const atoms: RecipeDef[] = [
  varCounter,
  varState,
  varFlag,
  classifierEventDetect,
  classifierMultiEvent,
  classifierDynamicLabel,
  generatorText,
  generatorImage,
  ruleStageDireciton,
  ruleStatusLine,
]

export default atoms
