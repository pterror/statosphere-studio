# Use Chat History

Only relevant when Use LLM is enabled. When on, the chat history is included in the LLM classification request for additional context.

Enabling this gives the model more information to make accurate judgments, at the cost of increased token usage and slower responses. Use it when the classifier's task genuinely requires conversation history — for example, detecting a change in topic rather than just the current message's content.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#usehistory)
