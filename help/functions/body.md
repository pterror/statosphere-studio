# Function Body

The formula the function evaluates and returns. For most uses, a single mathjs expression is all you need.

```
"body": "max(lo, min(hi, value))"
"body": "contains(text, pattern) ? \"yes\" : \"no\""
```

For advanced cases, the body is a real JavaScript function body — you can use `if`, `for`, `let`, `return`, and globals like `Math`, `JSON`, and `RegExp`. If you use multiple statements, add an explicit `return`.

Single-expression bodies work without `return` because mathjs wraps the result automatically.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/functions#body)
