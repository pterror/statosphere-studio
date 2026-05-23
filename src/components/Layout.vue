<template>
  <div class="flex flex-col flex-1 min-h-0">
    <nav class="flex border-b border-gray-800 bg-gray-900 shrink-0">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 text-sm transition-colors"
        :class="activeTab === tab.key
          ? 'border-b-2 border-indigo-400 text-indigo-300'
          : 'text-gray-400 hover:text-gray-200'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>
    <div class="flex flex-1 min-h-0">
      <component :is="sectionComponent" class="flex-1 min-w-0" />
    </div>
    <JsonFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import JsonFooter from './JsonFooter.vue'
import VariablesSection from './sections/VariablesSection.vue'
import FunctionsSection from './sections/FunctionsSection.vue'
import ClassifiersSection from './sections/ClassifiersSection.vue'
import GeneratorsSection from './sections/GeneratorsSection.vue'
import ContentRulesSection from './sections/ContentRulesSection.vue'

const tabs = [
  { key: 'variables', label: 'Variables' },
  { key: 'functions', label: 'Functions' },
  { key: 'classifiers', label: 'Classifiers' },
  { key: 'generators', label: 'Generators' },
  { key: 'contentRules', label: 'Content Rules' },
  { key: 'templates', label: 'Templates' },
  { key: 'reference', label: 'Reference' },
  { key: 'settings', label: 'Settings' },
]

const activeTab = ref('variables')

const sectionMap: Record<string, unknown> = {
  variables: VariablesSection,
  functions: FunctionsSection,
  classifiers: ClassifiersSection,
  generators: GeneratorsSection,
  contentRules: ContentRulesSection,
}

const sectionComponent = computed(() => sectionMap[activeTab.value] ?? null)
</script>
