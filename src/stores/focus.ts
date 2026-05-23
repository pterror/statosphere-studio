import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface FocusedField {
  section: string
  field: string
}

export const useFocusStore = defineStore('focus', () => {
  const focusedField = ref<FocusedField | null>(null)

  function setFocus(section: string, field: string) {
    focusedField.value = { section, field }
  }

  function clearFocus() {
    focusedField.value = null
  }

  return { focusedField, setFocus, clearFocus }
})
