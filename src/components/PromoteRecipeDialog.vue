<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center" @mousedown.self="close">
      <div class="fixed inset-0 bg-black/60" @mousedown="close" />
      <div class="relative z-10 bg-gray-900 border border-gray-700 rounded-xl w-[680px] max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-800">
          <h2 class="text-gray-100 font-semibold">Promote to Recipe</h2>
          <p class="text-xs text-gray-400 mt-1">Mark string fields as params to make them configurable in the new recipe.</p>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
          <!-- Recipe metadata -->
          <div class="flex flex-col gap-3">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipe details</h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-xs text-gray-400">Name <span class="text-red-400">*</span></label>
                <input
                  v-model="recipeName"
                  class="input-field"
                  placeholder="My Custom Recipe"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs text-gray-400">Tags (comma-separated)</label>
                <input
                  v-model="recipeTags"
                  class="input-field"
                  placeholder="combat, tracker"
                />
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-400">Description</label>
              <input
                v-model="recipeDescription"
                class="input-field"
                placeholder="What does this recipe do?"
              />
            </div>
          </div>

          <!-- Element fields -->
          <div v-for="section in sections" :key="section.elementType + '-' + section.index" class="flex flex-col gap-2">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {{ section.elementType }} [{{ section.index }}]
              <span v-if="section.elementName" class="normal-case text-gray-500 ml-1">— {{ section.elementName }}</span>
            </h3>
            <div v-for="field in section.fields" :key="field.key" class="flex items-start gap-3 rounded-lg border border-gray-800 px-3 py-2 bg-gray-850">
              <div class="flex-1 min-w-0">
                <div class="text-xs text-gray-400 mb-0.5">{{ field.key }}</div>
                <div class="text-sm text-gray-200 font-mono truncate max-w-[280px]">{{ field.value }}</div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <label class="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="isParamField(section.elementType, section.index, field.key)"
                    class="accent-indigo-500"
                    @change="toggleParam(section.elementType, section.index, field.key, field.value, $event)"
                  />
                  Param
                </label>
              </div>
              <!-- Param config when marked -->
              <div
                v-if="isParamField(section.elementType, section.index, field.key)"
                class="w-full mt-2 flex flex-col gap-2"
              >
                <div class="grid grid-cols-3 gap-2">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-gray-500">Param key</label>
                    <input
                      :value="getParamConfig(section.elementType, section.index, field.key)!.paramKey"
                      class="input-field text-xs"
                      @input="updateParamConfig(section.elementType, section.index, field.key, 'paramKey', ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-gray-500">Label</label>
                    <input
                      :value="getParamConfig(section.elementType, section.index, field.key)!.label"
                      class="input-field text-xs"
                      @input="updateParamConfig(section.elementType, section.index, field.key, 'label', ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-gray-500">Kind</label>
                    <select
                      :value="getParamConfig(section.elementType, section.index, field.key)!.kind"
                      class="input-field text-xs"
                      @change="updateParamConfig(section.elementType, section.index, field.key, 'kind', ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="label-list">label-list</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-800 flex items-center justify-between gap-3">
          <div v-if="error" class="text-xs text-red-400">{{ error }}</div>
          <div v-else class="text-xs text-gray-500">{{ paramCount }} param(s) defined</div>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700" @click="close">Cancel</button>
            <button
              class="px-4 py-1.5 rounded text-sm bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!recipeName.trim()"
              @click="onCreate"
            >Create recipe</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecipeInstance, SchemaArrays, ElementType, RecipeDef, ParamSpec, Substitution } from '../recipes/types'
import { localsFromTemplate } from '../recipes/materialize'
import { useRecipesStore } from '../stores/recipes'

const props = defineProps<{
  instance: RecipeInstance
  materialized: SchemaArrays
}>()

const open = defineModel<boolean>('open', { default: false })
const recipesStore = useRecipesStore()

const recipeName = ref(props.instance.name)
const recipeDescription = ref('')
const recipeTags = ref('')
const error = ref('')

const ELEMENT_TYPES: ElementType[] = ['variables', 'classifiers', 'generators', 'contentRules', 'functions']

// Collect all string-valued leaf fields from materialized elements.
interface FieldEntry {
  elementType: ElementType
  index: number
  elementName: string
  key: string
  value: string
}

// Flatten an object's string-leaf fields with dot-notation keys.
function collectStringFields(obj: any, prefix = ''): { key: string; value: string }[] {
  if (!obj || typeof obj !== 'object') return []
  const results: { key: string; value: string }[] = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      results.push({ key: fullKey, value: v })
    } else if (Array.isArray(v)) {
      // Treat arrays of strings as a single field (label-list style).
      if (v.every((x) => typeof x === 'string')) {
        results.push({ key: fullKey, value: v.join(', ') })
      } else {
        // Recurse into array items.
        v.forEach((item, i) => {
          results.push(...collectStringFields(item, `${fullKey}[${i}]`))
        })
      }
    } else if (typeof v === 'object' && v !== null) {
      results.push(...collectStringFields(v, fullKey))
    }
  }
  return results
}

interface Section {
  elementType: ElementType
  index: number
  elementName: string
  fields: { key: string; value: string }[]
}

const sections = computed<Section[]>(() => {
  const result: Section[] = []
  for (const et of ELEMENT_TYPES) {
    const arr = props.materialized[et]
    arr.forEach((el, i) => {
      const fields = collectStringFields(el)
      if (fields.length > 0) {
        result.push({ elementType: et, index: i, elementName: (el as { name?: string })?.name ?? '', fields })
      }
    })
  }
  return result
})

// Track which fields are promoted to params.
interface ParamConfig {
  paramKey: string
  label: string
  kind: 'string' | 'number' | 'label-list'
}

// Key: `${elementType}:${index}:${fieldKey}`
const paramFields = ref<Map<string, ParamConfig>>(new Map())

function fieldKey(et: ElementType, index: number, key: string): string {
  return `${et}:${index}:${key}`
}

function isParamField(et: ElementType, index: number, key: string): boolean {
  return paramFields.value.has(fieldKey(et, index, key))
}

function getParamConfig(et: ElementType, index: number, key: string): ParamConfig | undefined {
  return paramFields.value.get(fieldKey(et, index, key))
}

function toggleParam(et: ElementType, index: number, key: string, value: string, e: Event) {
  const fk = fieldKey(et, index, key)
  const checked = (e.target as HTMLInputElement).checked
  if (checked) {
    // Derive a reasonable default param key from the field path.
    const defaultKey = key.replace(/\W+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()
    paramFields.value.set(fk, { paramKey: defaultKey, label: key, kind: 'string' })
  } else {
    paramFields.value.delete(fk)
  }
  // Force reactivity on the Map.
  paramFields.value = new Map(paramFields.value)
}

function updateParamConfig(et: ElementType, index: number, key: string, field: keyof ParamConfig, value: string) {
  const fk = fieldKey(et, index, key)
  const config = paramFields.value.get(fk)
  if (config) {
    paramFields.value.set(fk, { ...config, [field]: value })
    paramFields.value = new Map(paramFields.value)
  }
}

const paramCount = computed(() => paramFields.value.size)

function dotPathToArray(key: string): string[] {
  // Convert "foo.bar[2].baz" → ['foo', 'bar', '2', 'baz'] — simple bracket notation.
  return key.replace(/\[(\d+)\]/g, '.$1').split('.')
}

function close() {
  open.value = false
}

function onCreate() {
  error.value = ''
  if (!recipeName.value.trim()) {
    error.value = 'Name is required.'
    return
  }

  // Build template: snapshot of current materialized output.
  const template: SchemaArrays = structuredClone(props.materialized)

  // Build substitutions list and ParamSpec array.
  const substitutions: Substitution[] = []
  const params: ParamSpec[] = []
  const seenKeys = new Set<string>()

  for (const [fk, config] of paramFields.value) {
    const [et, indexStr, ...keyParts] = fk.split(':')
    const elementType = et as ElementType
    const index = parseInt(indexStr, 10)
    const key = keyParts.join(':')
    const fieldPath = dotPathToArray(key)

    const paramKey = config.paramKey || key
    if (!seenKeys.has(paramKey)) {
      seenKeys.add(paramKey)
      // Use the raw string value from the template as the default.
      let defaultVal: any = template[elementType]?.[index]
      for (const p of fieldPath) {
        defaultVal = defaultVal?.[p]
      }
      if (config.kind === 'string') {
        params.push({ kind: 'string', key: paramKey, label: config.label, default: String(defaultVal ?? '') })
      } else if (config.kind === 'number') {
        params.push({ kind: 'number', key: paramKey, label: config.label, default: Number(defaultVal) || 0 })
      } else {
        // label-list: default is the comma-split of the joined string.
        const raw = String(defaultVal ?? '')
        params.push({ kind: 'label-list', key: paramKey, label: config.label, default: raw ? raw.split(',').map((s) => s.trim()) : [] })
      }
    }

    substitutions.push({ path: { elementType, index, fieldPath }, paramKey })
  }

  const tags = recipeTags.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const def: RecipeDef = {
    id: `custom-${crypto.randomUUID()}`,
    name: recipeName.value.trim(),
    description: recipeDescription.value.trim(),
    tags,
    params,
    locals: localsFromTemplate(template),
    source: { kind: 'template', template, substitutions },
  }

  recipesStore.addCustomRecipe(def)
  close()
}
</script>

<style scoped>
.input-field {
  @apply bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-indigo-500 w-full;
}
</style>
