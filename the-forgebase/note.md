# ForgeBase Notes

## Database Library

### excludedTables Feature

Using the excludedTables feature of the database lib has the following caveat:

1. If you want to run multi-node, the excludedTables list must be provided at build time and should not be changed at runtime.

This is important because changing the excludedTables list at runtime in a multi-node environment could lead to inconsistent behavior across different nodes, as each node might have a different configuration.
