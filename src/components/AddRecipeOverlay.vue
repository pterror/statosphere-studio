<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-black/60 z-40" />
      <DialogContent class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border border-gray-700 rounded-lg p-6 w-[560px] max-w-[90vw] shadow-xl flex flex-col gap-4">
        <DialogTitle class="text-gray-100 font-semibold">Add Recipe</DialogTitle>
        <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          <button
            v-for="recipe in recipes"
            :key="recipe.id"
            class="text-left px-4 py-3 rounded border border-gray-700 hover:border-indigo-500 hover:bg-gray-800 transition-colors"
            @click="pick(recipe.id)"
          >
            <div class="text-sm font-medium text-gray-100">{{ recipe.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5">{{ recipe.description }}</div>
          </button>
        </div>
        <div class="flex justify-end">
          <DialogClose class="px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700">Cancel</DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import { listRecipes } from '../recipes/registry'
import { useRecipesStore } from '../stores/recipes'

const open = defineModel<boolean>('open', { default: false })
const recipesStore = useRecipesStore()

const recipes = listRecipes().filter((r) => r.id !== 'custom')

function pick(id: string) {
  recipesStore.addInstance(id)
  open.value = false
}
</script>
