import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/** Meta key for dispatching the saved rewrite-selection range. Set to { from, to } or null. */
export const BOOKMARK_RANGE_META = 'resumeBookmarkRange'

type BookmarkState = { from: number; to: number } | null

const bookmarkPluginKey = new PluginKey('resumeBookmarkHighlight')

function validRange(doc: { content: { size: number } }, from: number, to: number): boolean {
  return (
    typeof from === 'number' &&
    typeof to === 'number' &&
    from >= 0 &&
    to > from &&
    to <= doc.content.size
  )
}

/**
 * Renders a highlight over the "saved for rewrite" range when the user has
 * clicked outside the editor (e.g. into the instructions field). Dispatch
 * tr.setMeta(BOOKMARK_RANGE_META, { from, to }) or null to set/clear.
 */
export const BookmarkHighlightExtension = Extension.create({
  name: 'resumeBookmarkHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: bookmarkPluginKey,
        state: {
          init(): BookmarkState {
            return null
          },
          apply(tr, value: BookmarkState): BookmarkState {
            const meta = tr.getMeta(BOOKMARK_RANGE_META)
            if (meta === undefined) return value
            return meta as BookmarkState
          },
        },
        props: {
          decorations(state) {
            const raw = bookmarkPluginKey.get(state)
            const pluginState: BookmarkState =
              raw && typeof raw === 'object' && 'from' in raw && 'to' in raw ? (raw as BookmarkState) : null
            if (!pluginState || pluginState.from >= pluginState.to) {
              return null
            }
            const { doc } = state
            if (!validRange(doc, pluginState.from, pluginState.to)) {
              return null
            }
            const deco = Decoration.inline(pluginState.from, pluginState.to, {
              class: 'resumeEditorBookmarkHighlight',
            })
            return DecorationSet.create(doc, [deco])
          },
        },
      }),
    ]
  },
})
