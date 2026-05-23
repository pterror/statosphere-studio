# Generator Dependencies

A comma-separated list of classifier or generator names that must complete before this generator fires.

Use when this generator's prompt or condition depends on a variable that another classifier or generator writes. For example, a scene image generator might depend on a location classifier that sets `currentScene`.

```
"dependencies": "LocationClassifier"
```

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/generators#dependencies)
