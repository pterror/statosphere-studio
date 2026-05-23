# Input Hypothesis Template

The hypothesis template for classifying user messages. The `{}` placeholder — single curly braces, not `{{}}` — is substituted with each classification label in turn and scored against the input template.

```
"inputHypothesis": "This message expresses {} sentiment."
"inputHypothesis": "The user is attempting to {}."
"inputHypothesis": "This is a {} action."
```

Write a natural-language sentence that fits each label when `{}` is replaced. The NLP model compares your hypothesis to the input text and scores how well they match.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#inputhypothesis)
