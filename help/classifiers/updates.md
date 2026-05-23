# Classification Updates

Variable updates applied when this label wins (its score meets the threshold, and it beats any competing labels in the same category).

Each update has a variable name and a `setTo` expression. The `setTo` value is evaluated as a formula — wrap string literals in escaped quotes:

```json
"updates": [
  { "variable": "mood", "setTo": "\"happy\"" },
  { "variable": "lastEvent", "setTo": "\"positive_input\"" }
]
```

Multiple updates in one label all apply atomically when the label fires.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#updates)
