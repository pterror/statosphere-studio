<template>
  <aside class="w-56 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-800">
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{{ label }}</span>
      <button
        class="text-indigo-400 hover:text-indigo-300 text-lg leading-none"
        @click="$emit('add')"
      >+</button>
    </div>
    <ul class="flex-1 overflow-y-auto">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="px-3 py-2 cursor-pointer text-sm truncate transition-colors flex items-center gap-1.5"
        :class="selected === i
          ? 'bg-indigo-900 text-indigo-200'
          : 'text-gray-300 hover:bg-gray-800'"
        @click="$emit('select', i)"
      >
        <span class="flex-1 truncate">{{ item || `(unnamed ${i + 1})` }}</span>
        <span
          v-if="lintCounts && lintCounts[i]"
          class="shrink-0 w-2 h-2 rounded-full bg-yellow-400"
          :title="`${lintCounts[i]} lint${lintCounts[i] === 1 ? '' : 's'}`"
        />
      </li>
      <li v-if="items.length === 0" class="px-3 py-4 text-xs text-gray-600 text-center">
        No {{ label.toLowerCase() }} yet
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  items: string[]
  selected: number | null
  lintCounts?: Record<number, number>
}>()

defineEmits<{
  add: []
  select: [index: number]
}>()
</script>
