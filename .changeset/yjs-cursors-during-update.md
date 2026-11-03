---
'@lexical/yjs': patch
---

[fix] Clicking a check list item while a collaborator is in the document toggles it, instead of throwing in development builds and losing the change with collab v1

Verify: with collaboration on and a second window in the same room, click into the text in one window, then click a check list item's checkbox there. It toggles at once, and the other window shows it.
