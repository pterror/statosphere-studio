# Generator Prompt

The prompt sent to the LLM or image model. This is an expression (or a string template). Use template tags to include current variable state.

```
"prompt": "\"Summarize the last few events in one sentence.\""
"prompt": "\"A fantasy scene: \" + currentScene"
"prompt": "\"{{char}} currently feels \" + mood + \". HP: \" + hp + \"/\" + max_hp"
```

For image generators, this is the positive prompt describing the desired image. For text generators, this is the full prompt sent to the LLM.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/generators#prompt)
