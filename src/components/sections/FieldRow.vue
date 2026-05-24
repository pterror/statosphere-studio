<template>
  <div class="flex flex-col gap-1" @focusin="onFocusIn">
    <div class="flex items-center gap-1">
      <label class="text-xs font-medium text-gray-400">{{ label }}</label>
      <PopoverRoot v-if="summary">
        <PopoverTrigger as-child>
          <button class="text-gray-600 hover:text-indigo-400 flex-shrink-0" type="button" tabindex="-1" :aria-label="summary ? `Info: ${summary}` : 'Show info'">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          :side-offset="4"
          class="z-50 max-w-xs rounded bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 shadow-lg"
        >
          {{ summary }}
        </PopoverContent>
      </PopoverRoot>
    </div>
    <slot />
    <p v-if="desc" class="text-xs text-gray-600">{{ desc }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverContent } from 'reka-ui'
import { useFocusStore } from '../../stores/focus'
import { getHelpSummary } from '../../help/loader'

const props = defineProps<{
  label: string
  desc?: string
  section?: string
  field?: string
}>()

const focusStore = useFocusStore()

const summary = computed(() => {
  if (!props.section || !props.field) return null
  return getHelpSummary(props.section, props.field)
})

function onFocusIn() {
  if (props.section && props.field) {
    focusStore.setFocus(props.section, props.field)
  }
}
</script>
