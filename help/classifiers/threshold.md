# Classification Threshold

The minimum score (0–1) for this label's updates to be applied. The default is `0.7`.

Start at `0.6`. If the classifier never fires when it should, lower it (try `0.5`, then `0.4`). If it fires too often on unrelated messages, raise it (try `0.75`, then `0.8`). Values below `0.3` fire on almost anything; above `0.9` only on near-certain matches.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/classifiers#threshold)
