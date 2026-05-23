# Input Template

If set, this classifier runs on the user's message. The value is a string sent to the classification model. Almost always `"{{content}}"` to pass the user's message directly.

You can include additional context as extra text alongside `{{content}}` if the classifier needs it. Leave blank to skip input classification for this classifier.

```
"inputTemplate": "{{content}}"
"inputTemplate": "User message: {{content}}. Context: {{currentScene}}"
```

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#inputtemplate)
