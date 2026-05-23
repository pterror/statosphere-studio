<template>
  <div
    ref="drawerRef"
    class="border border-gray-700 rounded bg-gray-900 p-4 flex flex-col gap-3"
  >
    <VariableForm v-if="elementType === 'variables'" :item="element" @change="emit('change')" />
    <ClassifierForm v-else-if="elementType === 'classifiers'" :item="element" @change="emit('change')" />
    <GeneratorForm v-else-if="elementType === 'generators'" :item="element" @change="emit('change')" />
    <ContentRuleForm v-else-if="elementType === 'contentRules'" :item="element" @change="emit('change')" />
    <FunctionDefForm v-else-if="elementType === 'functions'" :item="element" @change="emit('change')" />
  </div>
</template>

<script setup lang="ts">
import type { ElementType } from '../recipes/types'
import VariableForm from './forms/VariableForm.vue'
import ClassifierForm from './forms/ClassifierForm.vue'
import GeneratorForm from './forms/GeneratorForm.vue'
import ContentRuleForm from './forms/ContentRuleForm.vue'
import FunctionDefForm from './forms/FunctionDefForm.vue'

defineProps<{
  elementType: ElementType
  element: any
}>()
const emit = defineEmits<{ change: [] }>()
</script>
