# Documentation of `@spikypanda/mcp`

## `broker-field-report.html`

Integration report written for the `@cyanmycelium/mcp-broker` maintainers, covering
the wiring of this package's browser-hosted MCP server into a broker slot.

It is kept here rather than in a general docs folder because it is integration
knowledge about the dependency this package is built on: the transport pairing it
documents is the reason `provider.ts` uses `DirectTransport` and not
`MultiplexTransport`, and anyone changing that line should read it first.

The file is the **source** of the published artifact. To revise it, edit this file
and republish it against the existing artifact URL rather than creating a second
one, so the link already handed to the team keeps working.

Published at: https://claude.ai/code/artifact/fcbf10f4-cdb0-4e04-8c9b-079444b84124
