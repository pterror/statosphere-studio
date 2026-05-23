# Response Template

If set, this classifier also runs on the bot's reply. Same format as Input Template. Leave blank to skip response classification.

You can set both Input Template and Response Template — the classifier runs twice per turn, once on the user's message and once on the bot's reply.

```
"responseTemplate": "{{content}}"
```

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#responsetemplate)
