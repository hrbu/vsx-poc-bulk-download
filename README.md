# POC Implementierung für Bulk-Download

```sh
# run download server
npm start

# run download server with garbage-collector tracing
# @see https://nodejs.org/en/docs/guides/diagnostics/memory/using-gc-traces
node --trace-gc lib/server.js


# run download server with
# * garbage-collector tracing
# * limited heap-size (in mb)
# @see https://nodejs.org/en/docs/guides/diagnostics/memory/using-gc-traces
node --trace-gc --max-old-space-size=15 lib/server.js

```
