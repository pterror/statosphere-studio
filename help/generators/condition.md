# Generator Condition

An expression. The generator only runs if this evaluates to truthy. Always set a condition — generators are expensive LLM or image API calls.

Common patterns:

```
"condition": "sceneChanged"
"condition": "turnCount % 5 == 0"
"condition": "isNull(recap)"
```

The last example fires only when `recap` has never been set — useful for one-time initialization.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/generators#condition)
