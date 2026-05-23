import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConfigTree } from './config'

const DRAFTS_KEY = 'statosphere-studio:drafts:v1'
const SCRATCH_KEY = 'statosphere-studio:scratch:v1'

export interface DraftSlot {
  name: string
  config: ConfigTree
  updatedAt: number
}

function loadFromStorage(): Record<string, DraftSlot> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, DraftSlot>
  } catch {
    return {}
  }
}

function saveToStorage(slots: Record<string, DraftSlot>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(slots))
}

export const useDraftsStore = defineStore('drafts', () => {
  const slots = ref<Record<string, DraftSlot>>(loadFromStorage())

  function save(name: string, config: ConfigTree): void {
    slots.value[name] = { name, config, updatedAt: Date.now() }
    saveToStorage(slots.value)
  }

  function load(name: string): DraftSlot | null {
    return slots.value[name] ?? null
  }

  function rename(oldName: string, newName: string): void {
    if (!slots.value[oldName] || oldName === newName) return
    slots.value[newName] = { ...slots.value[oldName], name: newName, updatedAt: Date.now() }
    delete slots.value[oldName]
    saveToStorage(slots.value)
  }

  function deleteDraft(name: string): void {
    delete slots.value[name]
    saveToStorage(slots.value)
  }

  function saveScratch(config: ConfigTree): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(SCRATCH_KEY, JSON.stringify(config))
  }

  function loadScratch(): ConfigTree | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(SCRATCH_KEY)
      if (!raw) return null
      return JSON.parse(raw) as ConfigTree
    } catch {
      return null
    }
  }

  return { slots, save, load, rename, delete: deleteDraft, saveScratch, loadScratch }
})
