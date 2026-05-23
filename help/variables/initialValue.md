# Initial Value

An expression evaluated once when the stage loads. The result becomes the variable's starting value.

To start a variable as a word, you need quotes inside quotes: `"\"neutral\""`. The outer quotes are required by JSON; the inner `\"` marks tell the formula parser this is a string, not a variable name. Numbers and booleans need no extra quotes: `100`, `false`.

```
{ "initialValue": "100" }
{ "initialValue": "\"neutral\"" }
{ "initialValue": "false" }
```

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/variables#initialvalue)
