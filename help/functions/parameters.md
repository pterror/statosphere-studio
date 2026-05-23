# Function Parameters

A comma-separated list of parameter names available inside the function body.

```
"parameters": "value, lo, hi"
"parameters": "text, pattern"
"parameters": "a, b"
```

If a parameter has the same name as one of your config variables, the parameter wins inside the function — the global variable is not visible there. Avoid reusing variable names as parameters.

Config variables and other custom functions referenced inside the body are injected as extra parameters automatically by Statosphere — you do not need to declare them.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/functions#parameters)
