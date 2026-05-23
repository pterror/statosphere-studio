# Per-Turn Update (Initial Input Update)

A formula whose result replaces this variable's value at the very start of processing the user's message, before any classifiers run.

This is the most commonly used update field. Use it for things that should reset or advance each turn — incrementing a counter, resetting a flag, or re-deriving a value from other variables.

```
"perTurnUpdate": "turnCount + 1"
"perTurnUpdate": "false"
```

Leave blank to skip this phase.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/variables#update-phases)
