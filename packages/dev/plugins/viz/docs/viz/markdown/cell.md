# Markdown Cell

`Viz.Markdown:cell`

Jupyter-style Markdown notebook cell rendered as a Dashboard tile. Drop it next to your viz tiles, type prose / equations / conclusions, and the cell renders inline alongside the live charts. A saved graph round-trips the text verbatim, so the dashboard doubles as a self-contained lab notebook: data pipeline and human commentary in one file.

## Dashboard tile (IRenderable)

Like every `Viz.*` node, dropping it from the palette auto-mounts a tile in the dashboard panel; the close button removes the tile only, the node (and its text) stays in the graph. The cell is gesture-driven: `repaint()` is a no-op, there is no per-frame work.

## Ports

None. Markdown cells are pure documentation; they consume and emit nothing. The node still receives normal `fire()` calls (used only to track the running state below).

## Editing UX

- Default mode is VIEW: the content is rendered to HTML (CommonMark-ish, via `marked`).
- Double-click the body to switch to EDIT: a plain textarea replaces the rendered HTML, pre-filled and focused with the caret at the end.
- Blur, Esc, or Ctrl+Enter (Cmd+Enter on Mac) commits the textarea back to the content and returns to view. There is no separate "revert": Esc commits too, one mental model deep.
- While the runner is PLAYING the cell is view-only (Jupyter convention: prose is documentation, not a live control). The cell reads `session.running` at click time; if play starts mid-edit, the in-progress text is committed and the cell reverts to view automatically.
- Unmounting mid-edit (navigating away, tile remount) also commits first: prose is never lost to a remount.

## Editables

| Field    | Default | Behavior                                                                                                    |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `locked` | false   | Forces view-only even when idle ("presentation mode"). Locking mid-edit commits and exits edit immediately. |

The `content` itself is deliberately NOT a property-panel editable: the panel only ships a single-line text input, which would mangle multi-line Markdown. Edit in place via the tile. Content and `locked` both persist through save/load; the view/edit mode does not (a freshly loaded graph always opens in view).

## Pitfalls

- Edit refusal is silent by design: no toast when the cell is locked or the runner is playing, the textarea simply does not appear. Check the play state and the `locked` flag before concluding the cell is broken.
- The default content is placeholder text ("# Notes ... Double-click to edit."); it ships with every new cell and saves like any other content.
