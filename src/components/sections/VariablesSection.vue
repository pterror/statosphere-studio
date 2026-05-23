<template>
  <div class="flex flex-1 min-h-0">
    <ElementList
      label="Variables"
      :items="store.config.variables.map((v) => v.name)"
      :selected="selected"
      @add="add"
      @select="selected = $event"
    />
    <div class="flex-1 min-w-0 overflow-y-auto p-4" v-if="item">
      <div class="flex flex-col gap-3 max-w-2xl">
        <FieldRow label="Name" desc="Name by which this variable is referenced throughout the stage.">
          <input v-model="item.name" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Initial Value" desc="The initial value for this variable when the stage is loaded.">
          <input v-model="item.initialValue" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Initial Input Update" desc="The value this variable will be set to immediately following a user's input.">
          <input v-model="item.perTurnUpdate" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Final Input Update" desc="The value this variable will be set to after a user's input has been processed (after classifiers have run).">
          <input v-model="item.postInputUpdate" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Initial Response Update" desc="The value this variable will be set to immediately following a bot's response.">
          <input v-model="item.preResponseUpdate" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <FieldRow label="Final Response Update" desc="The value this variable will be set to after a bot's response has been processed (after classifiers have run).">
          <input v-model="item.postResponseUpdate" class="field-input" @input="store.markDirty()" />
        </FieldRow>
        <div v-if="fieldErrors.length" class="text-xs text-red-400">
          <div v-for="e in fieldErrors" :key="e">{{ e }}</div>
        </div>
        <button class="btn-danger self-start" @click="remove">Remove</button>
      </div>
    </div>
    <div class="flex-1 flex items-center justify-center text-gray-600 text-sm" v-else>
      Select or add a variable
    </div>
    <HelpRail />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore, type Variable } from '../../stores/config'
import ElementList from '../ElementList.vue'
import HelpRail from '../HelpRail.vue'
import FieldRow from './FieldRow.vue'

const store = useConfigStore()
const selected = ref<number | null>(null)

const item = computed<Variable | null>(() =>
  selected.value !== null ? store.config.variables[selected.value] ?? null : null
)

const fieldErrors = computed(() =>
  store.errors.variables.filter((e) =>
    selected.value !== null && e.startsWith(`/${selected.value}`)
  )
)

function add() {
  store.config.variables.push({
    name: '',
    initialValue: '',
    perTurnUpdate: '',
    postInputUpdate: '',
    preResponseUpdate: '',
    postResponseUpdate: '',
  })
  selected.value = store.config.variables.length - 1
  store.markDirty()
}

function remove() {
  if (selected.value === null) return
  store.config.variables.splice(selected.value, 1)
  selected.value = Math.min(selected.value, store.config.variables.length - 1)
  if (store.config.variables.length === 0) selected.value = null
  store.markDirty()
}
</script>

<style scoped>
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500;
}
.btn-danger {
  @apply px-3 py-1 text-sm rounded bg-red-900 text-red-200 hover:bg-red-800;
}
</style>
