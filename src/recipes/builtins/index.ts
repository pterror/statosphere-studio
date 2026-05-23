import type { RecipeDef } from '../types'
import atoms from './atoms/index'
import hpTracker from './hp-tracker'
import moodCompanion from './mood-companion'
import staminaTracker from './stamina-tracker'
import backgroundSwapper from './background-swapper'
import npcRelationships from './npc-relationships'
import branchingScenario from './branching-scenario'
import inventory from './inventory'
import mysteryGame from './mystery-game'
import persistentMemory from './persistent-memory'
import timeOfDay from './time-of-day'
import custom from './custom'

const builtins: RecipeDef[] = [
  ...atoms,
  hpTracker,
  moodCompanion,
  staminaTracker,
  backgroundSwapper,
  npcRelationships,
  branchingScenario,
  inventory,
  mysteryGame,
  persistentMemory,
  timeOfDay,
  custom,
]

export default builtins
