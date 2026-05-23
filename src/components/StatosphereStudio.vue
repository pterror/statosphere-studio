<template>
  <div class="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans">
    <TopBar />
    <Layout />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import TopBar from './TopBar.vue'
import Layout from './Layout.vue'
import { hydrateFromLocation } from '../share/hydrate'

onMounted(() => {
  if (typeof window !== 'undefined') {
    hydrateFromLocation()
  }
})
</script>
