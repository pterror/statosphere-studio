<template>
  <div class="flex flex-col gap-1">
    <label class="text-xs font-medium text-gray-400">{{ label }}</label>
    <slot />
    <p v-if="desc" class="text-xs text-gray-600">{{ desc }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; desc?: string }>()
</script>
