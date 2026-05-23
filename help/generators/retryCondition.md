# Retry Condition

If this formula evaluates to `true` after the generator runs, the generator retries. `{{content}}` refers to the generator's output — use it to check whether the result is acceptable.

```
"retryCondition": "isNull({{content}}) or {{content}} == \"\""
"retryCondition": "not contains({{content}}, \"http\")"
```

The stage retries at most three times. Leave blank to never retry.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/generators#retrycondition)
