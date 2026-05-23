<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-y-auto">
    <div class="flex flex-col gap-3 p-4">
      <RecipeBlock
        v-for="inst in recipesStore.instances"
        :key="inst.id"
        :instance="inst"
        @remove="recipesStore.removeInstance($event)"
        @change="configStore.markDirty()"
      />
      <div v-if="recipesStore.instances.length === 0" class="flex items-center justify-center py-16 text-gray-600 text-sm">
        No recipes yet — click <span class="mx-1 text-indigo-400">+ Recipe</span> to add one.
      </div>
    </div>
    <JsonFooter />
  </div>
</template>

<script setup lang="ts">
import { useRecipesStore } from '../stores/recipes'
import { useConfigStore } from '../stores/config'
import RecipeBlock from './RecipeBlock.vue'
import JsonFooter from './JsonFooter.vue'

const recipesStore = useRecipesStore()
const configStore = useConfigStore()
</script>
