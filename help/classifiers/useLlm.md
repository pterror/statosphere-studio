# Use LLM

When enabled, sends the classification task to the chat LLM instead of the zero-shot NLP model hosted on Hugging Face.

LLM classification can give better results for complex or nuanced tasks, but is slower and uses more tokens. Use the NLP model (disabled) for most classifiers; switch to LLM only when you need richer contextual understanding.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#usellm)
