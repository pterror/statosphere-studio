# Generator Updates

Variable updates applied when the generator finishes. Use `{{content}}` in the `setTo` expression to reference the generator's output — the text the LLM produced or the URL of the generated image.

```json
"updates": [
  { "variable": "recap", "setTo": "{{content}}" },
  { "variable": "lastGeneratedAt", "setTo": "turnCount" }
]
```

The special variable `background` is recognized by Statosphere and used to set the chat background image when you store an image URL there.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/generators#updates)
