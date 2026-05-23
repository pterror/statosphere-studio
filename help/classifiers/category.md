# Classification Category

Labels in the same category compete: only the one with the highest score above its threshold has its updates applied. Labels without a category are independent.

Use categories to model mutually-exclusive states. For example, put `positive`, `neutral`, and `negative` all in the `"sentiment"` category so only the best match wins and mood is never set to two values at once.

```
{ "category": "sentiment" }
{ "category": "action" }
```

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#category)
