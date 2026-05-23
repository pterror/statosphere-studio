# Post-Response Update (Final Response Update)

A formula whose result replaces this variable's value after response classifiers have run — the last update step in each turn.

Use this to derive summary values that depend on what response classifiers detected. A common pattern is a status label derived from a numeric variable:

```
"postResponseUpdate": "hp < 25 ? \"critical\" : hp < 60 ? \"hurt\" : \"fine\""
```

Leave blank if you do not need a post-response update.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/variables#update-phases)
