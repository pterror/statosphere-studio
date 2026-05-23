# Content Rule Modification

An expression whose result replaces (or extends) the content for this rule's category.

Use `{{content}}` to embed the current content rather than replacing it entirely. Rules run in order — each rule sees the output of the previous one as `{{content}}`.

```json
{ "modification": "\"{{content}} [The user seems agitated.]\"" }
{ "modification": "\"HP: \" + hp + \"/\" + max_hp + \". Mood: \" + mood + \".\"" }
{ "modification": "\"{{char}} is badly injured and struggling to speak.\"" }
```

For Stage Direction, the prefix `Response Instruction:` is added automatically by Statosphere.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/content-rules#modification)
