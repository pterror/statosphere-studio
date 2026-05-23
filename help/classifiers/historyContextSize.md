# History Context Size

The context limit (in tokens) for LLM requests when Use History is enabled. Set to `0` to defer to the preset size configured for the stage.

Use this to cap how much history is sent and keep LLM classification requests fast. A value of `2000`–`4000` is usually sufficient for sentiment or intent detection without including the entire conversation.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#historycontextsize)
