<template>
  <div v-if="lints.length" class="flex flex-col gap-2">
    <div
      v-for="lint in lints"
      :key="lint.id + lint.field"
      class="flex items-start gap-2 rounded bg-yellow-950 border border-yellow-800 px-3 py-2 text-xs text-yellow-200"
    >
      <span class="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
      <div class="flex-1 min-w-0">
        <span>{{ lint.message }}</span>
        <span class="ml-2">
          <a
            :href="lint.learnMore"
            target="_blank"
            rel="noopener noreferrer"
            class="text-yellow-400 hover:text-yellow-300 underline"
          >Learn more</a>
        </span>
      </div>
      <button
        v-if="lint.autoFix"
        class="shrink-0 px-2 py-0.5 rounded bg-yellow-800 hover:bg-yellow-700 text-yellow-100 text-xs"
        @click="applyFix(lint)"
      >
        Auto-fix
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LintResult } from '../stores/lints'
import type { ConfigTree } from '../stores/config'
import { useConfigStore } from '../stores/config'

defineProps<{
  lints: LintResult[]
}>()

const emit = defineEmits<{
  'apply-fix': [config: ConfigTree]
}>()

const configStore = useConfigStore()

function applyFix(lint: LintResult) {
  if (!lint.autoFix) return
  emit('apply-fix', lint.autoFix(configStore.config))
}
</script>
