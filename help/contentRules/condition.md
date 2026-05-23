# Content Rule Condition

A formula. The rule only fires if this evaluates to truthy (true or a number greater than zero). Leave blank to always apply.

```
{ "condition": "mood == \"angry\"" }
{ "condition": "hp < 25" }
{ "condition": "true" }
```

Rules that always fire (condition `true` or blank) run every turn — useful for unconditional stat displays in Stage Direction. Conditional rules are how you inject context that only matters sometimes.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/content-rules#condition)
