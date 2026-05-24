<template>
  <div class="chip-list">
    <!-- Existing chips -->
    <template v-for="(chip, ci) in modelValue" :key="ci">
      <!-- Editing a chip inline -->
      <input
        v-if="editingIndex === ci"
        :ref="(el) => { if (editingIndex === ci) editInputRef = el as HTMLInputElement }"
        v-model="editingValue"
        type="text"
        class="chip-input chip-edit-input"
        @keydown.enter.prevent="commitEdit(ci)"
        @keydown.esc.prevent="cancelEdit"
        @blur="commitEdit(ci)"
      />
      <!-- Display chip -->
      <span
        v-else
        class="chip-item"
        role="button"
        tabindex="0"
        :aria-label="`Edit chip: ${chip}`"
        @click="startEdit(ci)"
        @keydown.enter.prevent="startEdit(ci)"
        @keydown.space.prevent="startEdit(ci)"
      >
        {{ chip }}
        <button
          class="chip-remove"
          type="button"
          @click.stop="removeChip(ci)"
          :aria-label="`Remove ${chip}`"
        >×</button>
      </span>
    </template>

    <!-- New chip input -->
    <input
      v-if="editingIndex === null"
      ref="newInputRef"
      v-model="newValue"
      type="text"
      class="chip-input chip-new-input"
      :aria-label="label ? `Add ${label}` : 'Add item'"
      :placeholder="placeholder ?? '+ add'"
      @keydown.enter.prevent="commitNew"
      @keydown.tab="onTabNew"
      @keydown.backspace="onBackspace"
      @blur="onNewBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  placeholder?: string
  label?: string
}>(), {
  placeholder: undefined,
  label: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const newValue = ref('')
const editingIndex = ref<number | null>(null)
const editingValue = ref('')
const newInputRef = ref<HTMLInputElement | null>(null)
const editInputRef = ref<HTMLInputElement | null>(null)

watch(editingIndex, async (idx) => {
  if (idx !== null) {
    await nextTick()
    editInputRef.value?.focus()
    editInputRef.value?.select()
  }
})

function removeChip(ci: number) {
  const arr = [...props.modelValue]
  arr.splice(ci, 1)
  emit('update:modelValue', arr)
}

function commitNew() {
  const val = newValue.value.trim()
  if (!val || props.modelValue.includes(val)) {
    newValue.value = ''
    return
  }
  emit('update:modelValue', [...props.modelValue, val])
  newValue.value = ''
}

function onTabNew(e: KeyboardEvent) {
  const val = newValue.value.trim()
  if (val && !props.modelValue.includes(val)) {
    e.preventDefault()
    emit('update:modelValue', [...props.modelValue, val])
    newValue.value = ''
  }
}

function onBackspace() {
  if (newValue.value === '' && props.modelValue.length > 0) {
    const arr = [...props.modelValue]
    arr.pop()
    emit('update:modelValue', arr)
  }
}

function onNewBlur() {
  const val = newValue.value.trim()
  if (val && !props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val])
    newValue.value = ''
  }
}

function startEdit(ci: number) {
  editingValue.value = props.modelValue[ci]
  editingIndex.value = ci
}

function commitEdit(ci: number) {
  if (editingIndex.value !== ci) return
  const val = editingValue.value.trim()
  if (val && val !== props.modelValue[ci]) {
    // reject duplicate (unless it's the same slot)
    if (!props.modelValue.includes(val)) {
      const arr = [...props.modelValue]
      arr[ci] = val
      emit('update:modelValue', arr)
    }
  }
  editingIndex.value = null
}

function cancelEdit() {
  editingIndex.value = null
}
</script>

<style scoped>
.chip-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}

.chip-item {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1rem;
  background: rgba(31, 41, 55, 0.8);
  color: rgb(209, 213, 219);
  border: 1px solid rgb(55, 65, 81);
  cursor: pointer;
  user-select: none;
}

.chip-item:hover {
  background: rgba(55, 65, 81, 0.8);
  color: rgb(243, 244, 246);
}

:root[data-theme="light"] .chip-item {
  background: rgba(229, 231, 235, 0.8);
  color: rgb(31, 41, 55);
  border-color: rgb(156, 163, 175);
}

:root[data-theme="light"] .chip-item:hover {
  background: rgba(209, 213, 219, 0.8);
}

.chip-remove {
  color: rgb(107, 114, 128);
  line-height: 1;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.875rem;
}

.chip-remove:hover {
  color: rgb(248, 113, 113);
}

.chip-input {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1rem;
  outline: none;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  min-width: 4rem;
  max-width: 8rem;
}

:root[data-theme="light"] .chip-input {
  background: rgba(255, 255, 255, 0.5);
}

.chip-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.chip-new-input::placeholder {
  color: rgb(99, 102, 241);
  opacity: 0.8;
}
</style>
