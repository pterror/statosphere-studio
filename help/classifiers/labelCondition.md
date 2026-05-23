# Classification Condition

A formula. This label is only included in the classification task if this evaluates to truthy. Use this to remove irrelevant labels and make the model's job easier — fewer labels means more accurate scoring and faster results.

```
{ "condition": "inCombat" }
{ "condition": "hp > 0" }
```

Leave blank to always include this label.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#condition-1)
