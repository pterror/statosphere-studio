# Lazy

When enabled, this generator is intended to run without holding up the chat response. In the current release, this setting has no effect — all generators block the response regardless of this flag.

The field is stored and schema-valid, but the execution loop does not check it. Do not rely on lazy mode to reduce latency in the current release.

[Learn more →](https://pterror.github.io/statosphere-guide/reference/gotchas#the-lazy-field-has-no-effect)
