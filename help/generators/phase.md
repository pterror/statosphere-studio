# Generator Phase

When the generator fires during each turn:

- **On Input** — fires after the user sends a message, before the bot replies. Use for content that should be available to the bot's reply.
- **On Response** — fires after the bot replies. Use for summaries, images, or other output that the user sees after the response.

Note: there is no "Initialization" phase. To initialize a variable on the first turn, use `"On Input"` with a condition like `isNull(myVariable)`.

[Learn more →](https://pterror.github.io/statosphere-guide/syntax/generators#phase)
