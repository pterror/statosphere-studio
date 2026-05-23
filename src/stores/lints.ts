import { defineStore } from 'pinia'
import { ref } from 'vue'
import { runLints, type LintResult } from '../lints/index'
import { useConfigStore } from './config'

export { type LintResult }

export const useLintsStore = defineStore('lints', () => {
  const results = ref<LintResult[]>([])

  function recompute() {
    const configStore = useConfigStore()
    results.value = runLints(configStore.config)
  }

  return { results, recompute }
})
