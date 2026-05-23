<template>
  <header class="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
    <span class="font-semibold text-indigo-400 mr-auto">Statosphere Studio</span>
    <button disabled class="btn-stub">Templates</button>
    <button disabled class="btn-stub">Import</button>
    <button disabled class="btn-stub">Export</button>
    <button disabled class="btn-stub">Share</button>
    <button disabled class="btn-stub">Save</button>
  </header>
</template>

<style scoped>
.btn-stub {
  @apply px-3 py-1 rounded text-sm bg-gray-800 text-gray-400 cursor-not-allowed opacity-60;
}
</style>
