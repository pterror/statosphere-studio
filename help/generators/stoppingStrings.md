# Stopping Strings

A comma-delimited list of strings. If the LLM produces any of them, the response is cut off at that point.

Use this to keep text generator output clean and well-bounded:

```
"stoppingStrings": "\\n,."
```

This stops generation at the first newline or period, producing a single sentence. Useful for recap generators or label generators where you want one clean output.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/generators#stoppingstrings)
