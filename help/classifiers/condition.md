# Classifier Condition

A formula. The classifier only runs if this evaluates to truthy (true or a number greater than zero). Leave blank to always run.

Classifiers make network calls, so adding a condition to skip unnecessary runs is good practice. Gate on a variable that signals the classifier's context is relevant:

```
"condition": "hp > 0"
"condition": "inCombat"
"condition": "turnCount > 3"
```

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#condition)
