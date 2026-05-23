import { runLints } from '../src/lints/index'
import type { ConfigTree } from '../src/stores/config'

function makeBase(): ConfigTree {
  return {
    variables: [],
    functions: [],
    classifiers: [],
    generators: [],
    contentRules: [],
  }
}

let passed = 0
let failed = 0

function expect(label: string, ids: string[], results: ReturnType<typeof runLints>) {
  const found = new Set(results.map((r) => r.id))
  for (const id of ids) {
    if (found.has(id)) {
      console.log(`ok   ${label} → ${id}`)
      passed++
    } else {
      console.error(`FAIL ${label} → expected ${id}, got: [${[...found].join(', ')}]`)
      failed++
    }
  }
}

const i2iConfig: ConfigTree = {
  ...makeBase(),
  generators: [
    {
      name: 'test',
      type: 'Image-to-Image',
      phase: 'On Input',
      lazy: false,
      condition: '',
      dependencies: '',
      prompt: '',
      updates: [],
      imageToImageType: 'canny',
    },
  ],
}
expect('image-to-image-typo', ['image-to-image-typo'], runLints(i2iConfig))

const replaceVarConfig: ConfigTree = {
  ...makeBase(),
  variables: [{ name: 'x', initialValue: 'text.replace("a", "b")', perTurnUpdate: '', postInputUpdate: '', preResponseUpdate: '', postResponseUpdate: '' }],
}
expect('replace-bug (variable)', ['replace-bug'], runLints(replaceVarConfig))

const replaceGenConfig: ConfigTree = {
  ...makeBase(),
  generators: [
    {
      name: 'g',
      type: 'Text',
      phase: 'On Input',
      lazy: false,
      condition: '',
      dependencies: '',
      prompt: '',
      updates: [{ variable: 'x', setTo: 'val.replace("a","b")' }],
    },
  ],
}
expect('replace-bug (generator update)', ['replace-bug'], runLints(replaceGenConfig))

const replaceCrConfig: ConfigTree = {
  ...makeBase(),
  contentRules: [{ category: 'Input', condition: 'x.replace("a","b")', modification: '' }],
}
expect('replace-bug (contentRule)', ['replace-bug'], runLints(replaceCrConfig))

const initPhaseConfig: ConfigTree = {
  ...makeBase(),
  generators: [
    {
      name: 'g',
      type: 'Text',
      phase: 'Initialization' as 'On Input',
      lazy: false,
      condition: '',
      dependencies: '',
      prompt: '',
      updates: [],
    },
  ],
}
expect('initialization-phase', ['initialization-phase'], runLints(initPhaseConfig))

const undeclaredConfig: ConfigTree = {
  ...makeBase(),
  variables: [{ name: 'declared', initialValue: '', perTurnUpdate: '', postInputUpdate: '', preResponseUpdate: '', postResponseUpdate: '' }],
  generators: [
    {
      name: 'g',
      type: 'Text',
      phase: 'On Input',
      lazy: false,
      condition: '',
      dependencies: '',
      prompt: '"hello {{undeclaredVar}}"',
      updates: [],
    },
  ],
}
expect('undeclared-variable', ['undeclared-variable'], runLints(undeclaredConfig))

const innerQuoteConfig: ConfigTree = {
  ...makeBase(),
  variables: [{ name: 'mood', initialValue: '"neutral', perTurnUpdate: '', postInputUpdate: '', preResponseUpdate: '', postResponseUpdate: '' }],
}
expect('inner-quote-mismatch', ['inner-quote-mismatch'], runLints(innerQuoteConfig))

const singletonConfig: ConfigTree = {
  ...makeBase(),
  classifiers: [
    {
      name: 'cl',
      condition: '',
      dependencies: '',
      inputTemplate: '',
      inputHypothesis: '',
      responseTemplate: '',
      responseHypothesis: '',
      useLlm: false,
      useHistory: false,
      historyContextSize: 0,
      classifications: [
        { label: 'happy', condition: '', category: 'mood', threshold: 0.7, dynamic: false, updates: [] },
        { label: 'sad', condition: '', category: 'emotion', threshold: 0.7, dynamic: false, updates: [] },
      ],
    },
  ],
}
expect('singleton-category', ['singleton-category'], runLints(singletonConfig))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
