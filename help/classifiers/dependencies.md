# Classifier Dependencies

A comma-separated list of classifier or generator names that must complete before this classifier runs.

Use this when one classifier's result affects this classifier's condition — for example, a follow-up classifier that only runs if a primary classifier set a flag. Most simple configs do not need this field.

```
"dependencies": "CombatDetect, LocationCheck"
```

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#dependencies)
