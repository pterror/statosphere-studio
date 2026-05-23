<template>
  <div
    class="flex flex-col bg-gray-950 text-gray-100 font-sans"
    :class="embedded ? 'h-[600px] relative' : 'h-screen'"
  >
    <TopBar v-if="!embedded" />
    <Layout :class="embedded ? 'pt-0' : ''" />
    <a
      v-if="embedded"
      :href="openInStudioUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="absolute bottom-2 right-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
    >Open in full studio &rarr;</a>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import TopBar from './TopBar.vue'
import Layout from './Layout.vue'
import { hydrateFromLocation } from '../share/hydrate'
import { encodeConfig, decodeConfig } from '../share/encode'
import { useConfigStore } from '../stores/config'
import { useLintsStore } from '../stores/lints'
import type { ConfigTree } from '../stores/config'

const props = withDefaults(defineProps<{
  embedded?: boolean
  template?: string
  share?: string
  spaUrl?: string
}>(), {
  embedded: false,
  template: '',
  share: '',
  spaUrl: 'https://pterror.github.io/statosphere-studio/',
})

const templateFiles = import.meta.glob('../../templates/*.json', { eager: true }) as Record<
  string,
  { default: ConfigTree }
>

function getTemplateData(slug: string): ConfigTree | null {
  const key = `../../templates/${slug}.json`
  const mod = templateFiles[key]
  return mod ? (mod.default ?? (mod as unknown as ConfigTree)) : null
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const openInStudioUrl = computed(() => {
  if (typeof window === 'undefined') return props.spaUrl
  const configStore = useConfigStore()
  const encoded = encodeConfig(configStore.config)
  return `${props.spaUrl}#cfg=${encoded}`
})

onMounted(() => {
  const configStore = useConfigStore()
  const lintsStore = useLintsStore()

  if (props.share) {
    try {
      configStore.replace(decodeConfig(props.share))
    } catch {
    }
  } else if (props.template) {
    const data = getTemplateData(props.template)
    if (data) configStore.loadTemplate(data)
  } else {
    if (typeof window !== 'undefined') {
      hydrateFromLocation()
    }
  }

  lintsStore.recompute()

  watch(
    () => configStore.config,
    () => {
      if (debounceTimer !== null) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        lintsStore.recompute()
      }, 300)
    },
    { deep: true },
  )
})
</script>
