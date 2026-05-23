import type { RecipeDef } from '../types'

const def: RecipeDef = {
  id: 'persistent-memory',
  name: 'Persistent Memory Log',
  description: 'Detects fact-worthy responses and accumulates a running fact list.',
  tags: ['memory', 'facts', 'generator', 'classifier'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'known_facts_var',
        recipeId: 'atom/var-state',
        defaultName: 'Known Facts',
        paramBindings: {
          name: { kind: 'literal', value: 'known_facts' },
          initialValue: { kind: 'literal', value: '""' },
        },
      },
      {
        refId: 'fact_count_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Fact Count',
        paramBindings: {
          name: { kind: 'literal', value: 'fact_count' },
          initialValue: { kind: 'literal', value: 0 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'pending_var',
        recipeId: 'atom/var-flag',
        defaultName: 'New Fact Pending',
        paramBindings: {
          name: { kind: 'literal', value: 'new_fact_pending' },
          initialValue: { kind: 'literal', value: 'false' },
          perTurnUpdate: { kind: 'literal', value: 'false' },
        },
      },
      {
        refId: 'fact_cls',
        recipeId: 'atom/classifier-event-detect',
        defaultName: 'Fact Worthy Classifier',
        paramBindings: {
          name: { kind: 'literal', value: 'FactWorthy' },
          label: { kind: 'literal', value: 'a specific, lasting fact about the character, world, or relationship' },
          threshold: { kind: 'literal', value: 0.7 },
          hypothesis: { kind: 'literal', value: 'This response establishes {}.' },
          responseHypothesis: { kind: 'literal', value: 'This response establishes {}.' },
          inputTemplate: { kind: 'literal', value: '' },
          updates: { kind: 'literal', value: [
            { variable: 'new_fact_pending', setTo: 'true' },
            { variable: 'fact_count', setTo: 'fact_count + 1' },
          ] },
        },
      },
      {
        refId: 'extract_gen',
        recipeId: 'atom/generator-text',
        defaultName: 'Extract Fact Generator',
        paramBindings: {
          name: { kind: 'literal', value: 'ExtractFact' },
          phase: { kind: 'literal', value: 'On Response' },
          type: { kind: 'literal', value: 'Text' },
          lazy: { kind: 'literal', value: false },
          condition: { kind: 'literal', value: 'new_fact_pending' },
          prompt: { kind: 'literal', value: '"Summarize the single most important new lasting fact established in this message in one short sentence (15 words or fewer). Output only the sentence, no commentary.\\n\\nMessage: {{content}}"' },
          minTokens: { kind: 'literal', value: '5' },
          maxTokens: { kind: 'literal', value: '40' },
          updates: { kind: 'literal', value: [
            { variable: 'known_facts', setTo: 'known_facts == "" ? "{{content}}" : known_facts + " | " + "{{content}}"' },
          ] },
        },
      },
      {
        refId: 'memory_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Memory Direction',
        paramBindings: {
          condition: { kind: 'literal', value: 'known_facts != ""' },
          modification: { kind: 'literal', value: '"Established facts to remember: " + known_facts + ". Honor these facts in every response; do not contradict them."' },
        },
      },
    ],
  },
}

export default def
