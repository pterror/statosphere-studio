# Dynamic Label

When enabled, the Label field is treated as a formula that evaluates to a string or an array of strings — generating multiple labels at runtime. Useful when your label list is stored in a variable and changes during the chat.

```json
{
  "label": "characterNames",
  "dynamic": true
}
```

If `characterNames` evaluates to `["Alice", "Bob", "Carol"]`, the classifier tests all three labels in one call.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#dynamic)
