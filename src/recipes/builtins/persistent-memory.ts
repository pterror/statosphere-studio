import type { RecipeDef, SchemaArrays } from '../types'

const data: SchemaArrays = {
  variables: [
    { name: 'known_facts', initialValue: '""' },
    { name: 'fact_count', initialValue: '0' },
    { name: 'new_fact_pending', initialValue: 'false', perTurnUpdate: 'false' },
  ],
  functions: [],
  classifiers: [
    {
      name: 'FactWorthy',
      responseTemplate: '{{content}}',
      responseHypothesis: 'This response establishes {}.',
      classifications: [
        {
          label: 'a specific, lasting fact about the character, world, or relationship',
          threshold: 0.7,
          updates: [
            { variable: 'new_fact_pending', setTo: 'true' },
            { variable: 'fact_count', setTo: 'fact_count + 1' },
          ],
        },
      ],
    },
  ],
  generators: [
    {
      name: 'ExtractFact',
      type: 'Text',
      phase: 'On Response',
      lazy: false,
      condition: 'new_fact_pending',
      prompt:
        '"Summarize the single most important new lasting fact established in this message in one short sentence (15 words or fewer). Output only the sentence, no commentary.\\n\\nMessage: {{content}}"',
      minTokens: '5',
      maxTokens: '40',
      updates: [
        {
          variable: 'known_facts',
          setTo: 'known_facts == "" ? "{{content}}" : known_facts + " | " + "{{content}}"',
        },
      ],
    },
  ],
  contentRules: [
    {
      category: 'Stage Direction',
      condition: 'known_facts != ""',
      modification:
        '"Established facts to remember: " + known_facts + ". Honor these facts in every response; do not contradict them."',
    },
  ],
}

const def: RecipeDef = {
  id: 'persistent-memory',
  name: 'Persistent Memory Log',
  description: 'Detects fact-worthy responses and accumulates a running fact list.',
  tags: ['memory', 'facts', 'generator', 'classifier'],
  params: [],
  locals: {
    variables: ['known_facts', 'fact_count', 'new_fact_pending'],
    classifiers: ['FactWorthy'],
    generators: ['ExtractFact'],
    functions: [],
  },
  source: { kind: "builtin", materialize: () => JSON.parse(JSON.stringify(data)) },
}

export default def
