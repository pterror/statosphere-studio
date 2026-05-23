<template>
  <div class="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans">
    <TopBar />
    <Layout />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import TopBar from './TopBar.vue'
import Layout from './Layout.vue'
import { hydrateFromLocation } from '../share/hydrate'
import { useConfigStore } from '../stores/config'
import { useLintsStore } from '../stores/lints'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  if (typeof window !== 'undefined') {
    hydrateFromLocation()
  }

  const configStore = useConfigStore()
  const lintsStore = useLintsStore()

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
