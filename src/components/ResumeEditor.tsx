import { useEditor, EditorContent, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useImperativeHandle, forwardRef, useRef, useState } from 'react'
import { BookmarkHighlightExtension, BOOKMARK_RANGE_META } from '../extensions/BookmarkHighlight'

const extensions = [StarterKit, BookmarkHighlightExtension]

/** Escape HTML, then **bold** and *italic* → TipTap-friendly HTML. */
export function inlineMarkdownToHtml(line: string): string {
  let s = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return s
}

/** Plain text with markdown line breaks → <p>…</p> blocks (full document / paste). */
export function plainMarkdownToDocumentHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')

  type ListKind = 'ul' | 'ol'
  let currentList: ListKind | null = null
  let listItems: string[] = []
  const blocks: string[] = []

  const flushList = () => {
    if (!currentList) return
    if (!listItems.length) return
    const tag = currentList
    blocks.push(`<${tag}>${listItems.map((it) => `<li>${it}</li>`).join('')}</${tag}>`)
    currentList = null
    listItems = []
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()

    // Preserve blank lines as paragraph breaks.
    if (!trimmed) {
      flushList()
      blocks.push('<p><br></p>')
      continue
    }

    // Bullet list: "-", "*", "•"
    const bullet = rawLine.match(/^(\s*[-*•]\s+)(.+)$/)
    if (bullet) {
      const bulletText = bullet[2] ?? ''
      const item = inlineMarkdownToHtml(bulletText)
      if (currentList !== 'ul') {
        flushList()
        currentList = 'ul'
      }
      listItems.push(item)
      continue
    }

    // Ordered list: "1. item"
    const ordered = rawLine.match(/^(\s*\d+\.\s+)(.+)$/)
    if (ordered) {
      const orderedText = ordered[2] ?? ''
      const item = inlineMarkdownToHtml(orderedText)
      if (currentList !== 'ol') {
        flushList()
        currentList = 'ol'
      }
      listItems.push(item)
      continue
    }

    flushList()
    const inner = inlineMarkdownToHtml(rawLine)
    blocks.push(`<p>${inner || '<br>'}</p>`)
  }

  flushList()
  return blocks.join('')
}

export type ResumeEditorHandle = {
  getSelectedText: () => string
  replaceSelection: (text: string) => void
  getText: () => string
  /** Insert HTML or plain text at the start of the document (e.g. for generated summary). */
  insertContentAtStart: (htmlOrText: string) => void
  /** Replace the whole document from plain text (e.g. shorten / expand). */
  replaceFullDocumentFromPlain: (text: string) => void
  /** Plain text with ## for H2 and ### for H3, for PDF export. */
  getExportText: () => string
}

type ResumeEditorProps = {
  content: Content
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
  /** Called when selection changes (e.g. to show a rewrite prompt popup). */
  onSelectionChange?: (hasSelection: boolean) => void
  /** True after you select text then click outside the editor (instructions etc.); false when you click back in the doc or rewrite runs. */
  onRewriteBookmarkHint?: (show: boolean) => void
}

const ResumeEditor = forwardRef<ResumeEditorHandle, ResumeEditorProps>(function ResumeEditor(
  { content, onChange, className, onSelectionChange, onRewriteBookmarkHint },
  ref
) {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const storedRangeRef = useRef<{ from: number; to: number } | null>(null)
  /** Last mousedown was inside the document (not toolbar) — used to clear bookmark only when clicking in the doc. */
  const lastMousedownInProseRef = useRef(false)
  /** True after we save a selection highlight; cleared only after first click back inside the prose. */
  const bookmarkVisibleRef = useRef(false)
  /** UI state so the user always sees a clear “marked” indicator even if decoration is subtle. */
  const [bookmarkVisible, setBookmarkVisible] = useState(false)
  const editor = useEditor({
    extensions,
    content: content || '',
    editorProps: {
      attributes: {
        class: 'resumeEditorInner',
      },
      handleDOMEvents: {
        paste: (_view, event) => {
          const text = event.clipboardData?.getData('text/plain')
          const html = event.clipboardData?.getData('text/html')
          if (!text || html?.trim()) return false
          const looksLikeMd = /\*\*[^*]+\*\*|\*[^*]+\*/.test(text) || text.includes('\n')
          if (!looksLikeMd) return false
          const ed = editorRef.current
          if (!ed) return false
          event.preventDefault()
          const docHtml = text.includes('\n') ? plainMarkdownToDocumentHtml(text) : `<p>${inlineMarkdownToHtml(text)}</p>`
          ed.chain().focus().insertContent(docHtml).run()
          return true
        },
      },
    },
  })
  useEffect(() => {
    editorRef.current = editor ?? null
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const h = () => {
      const html = editor.getHTML()
      const text = editor.getText()
      onChange(html, text)
    }
    editor.on('update', h)
    return () => {
      editor.off('update', h)
    }
  }, [editor, onChange])

  useEffect(() => {
    if (!editor) return
    const root = editor.view.dom.closest('.resumeEditor')
    if (!root) return

    const notify = () => {
      const { from, to } = editor.state.selection
      const expanded = from !== to
      const stored = storedRangeRef.current
      const hasStored = !!(stored && stored.from < stored.to)
      const canRewrite = expanded || (hasStored && !editor.isFocused)
      onSelectionChange?.(canRewrite)
    }

    const proseEl = editor.view.dom

    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node
      const clickedInsideProse = proseEl.contains(t)
      lastMousedownInProseRef.current = clickedInsideProse

      // Only clear the saved selection highlight on an actual click back into the text.
      if (bookmarkVisibleRef.current && clickedInsideProse) {
        storedRangeRef.current = null
        bookmarkVisibleRef.current = false
        setBookmarkVisible(false)
        onRewriteBookmarkHint?.(false)
        try {
          editor.view.dispatch(editor.state.tr.setMeta(BOOKMARK_RANGE_META, null))
        } catch {
          // ignore
        }
        notify()
        return
      }
      if (root.contains(t)) return
      const { from, to } = editor.state.selection
      if (from !== to) {
        storedRangeRef.current = { from, to }
        bookmarkVisibleRef.current = true
        setBookmarkVisible(true)
        onRewriteBookmarkHint?.(true)
        notify()
        try {
          editor.view.dispatch(editor.state.tr.setMeta(BOOKMARK_RANGE_META, { from, to }))
        } catch {
          // ignore if view not ready
        }
      }
    }

    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        storedRangeRef.current = { from, to }
      } else if (editor.isFocused && lastMousedownInProseRef.current) {
        // Only clear the stored range in normal mode (no saved bookmark).
        // In "bookmarkVisibleRef.current" mode, we want the highlight to persist even if the
        // selection collapses while the user clicks away; it will be cleared on the
        // first click back inside the prose area.
        if (!bookmarkVisibleRef.current) {
          storedRangeRef.current = null
          setBookmarkVisible(false)
          onRewriteBookmarkHint?.(false)
          try {
            editor.view.dispatch(editor.state.tr.setMeta(BOOKMARK_RANGE_META, null))
          } catch {
            // ignore
          }
        }
      }
      notify()
    }

    const onBlur = () => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        storedRangeRef.current = { from, to }
        bookmarkVisibleRef.current = true
        setBookmarkVisible(true)
        onRewriteBookmarkHint?.(true)
        try {
          editor.view.dispatch(editor.state.tr.setMeta(BOOKMARK_RANGE_META, { from, to }))
        } catch {
          // ignore
        }
      }
      notify()
    }

    document.addEventListener('mousedown', onDocMouseDown, true)
    editor.on('selectionUpdate', onSelectionUpdate)
    editor.on('blur', onBlur)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown, true)
      editor.off('selectionUpdate', onSelectionUpdate)
      editor.off('blur', onBlur)
    }
  }, [editor, onSelectionChange, onRewriteBookmarkHint])

  useImperativeHandle(
    ref,
    () => ({
      getSelectedText: () => {
        if (!editor) return ''
        const { from, to } = editor.state.selection
        let a = from
        let b = to
        if (a === b) {
          const s = storedRangeRef.current
          if (!s || s.from >= s.to) return ''
          const end = editor.state.doc.content.size
          if (s.from < 0 || s.to > end) return ''
          a = s.from
          b = s.to
        }
        return editor.state.doc.textBetween(a, b, '\n')
      },
      replaceSelection: (text: string) => {
        if (!editor || !text) return
        const raw = text.replace(/\r\n/g, '\n').trim()
        if (!raw) return
        const html = raw.includes('\n')
          ? plainMarkdownToDocumentHtml(raw)
          : inlineMarkdownToHtml(raw)
        const { from, to } = editor.state.selection
        let a = from
        let b = to
        if (a === b && storedRangeRef.current && storedRangeRef.current.from < storedRangeRef.current.to) {
          const end = editor.state.doc.content.size
          const s = storedRangeRef.current
          if (s.from >= 0 && s.to <= end) {
            a = s.from
            b = s.to
          }
        }
        if (a >= b) return
        storedRangeRef.current = null
        bookmarkVisibleRef.current = false
        setBookmarkVisible(false)
        onRewriteBookmarkHint?.(false)
        try {
          editor.view.dispatch(editor.state.tr.setMeta(BOOKMARK_RANGE_META, null))
        } catch {
          // ignore
        }
        editor.chain().focus().setTextSelection({ from: a, to: b }).insertContent(html).run()
      },
      getText: () => editor?.getText() ?? '',
      insertContentAtStart: (htmlOrText: string) => {
        if (!editor) return
        const t = htmlOrText.trim()
        const content = t.startsWith('<')
          ? htmlOrText
          : plainMarkdownToDocumentHtml(htmlOrText.replace(/\r\n/g, '\n'))
        editor.chain().focus().insertContentAt(0, content).run()
      },
      replaceFullDocumentFromPlain: (text: string) => {
        if (!editor) return
        const raw = text.replace(/\r\n/g, '\n').trim()
        if (!raw) return
        const html = plainMarkdownToDocumentHtml(raw)
        storedRangeRef.current = null
        bookmarkVisibleRef.current = false
        setBookmarkVisible(false)
        onRewriteBookmarkHint?.(false)
        try {
          editor.view.dispatch(editor.state.tr.setMeta(BOOKMARK_RANGE_META, null))
        } catch {
          // ignore
        }
        editor.chain().focus().setContent(html, false).run()
      },
      getExportText: () => {
        if (!editor?.state.doc) return editor?.getText() ?? ''
        const parts: string[] = []
        editor.state.doc.forEach((node) => {
          if (node.type.name === 'heading') {
            const level = node.attrs.level as number
            const prefix = level === 1 ? '#' : level === 2 ? '##' : '###'
            const text = node.textContent.trim()
            if (text) parts.push(`${prefix} ${text}`)
          } else if (node.type.name === 'paragraph' || node.type.name === 'blockquote') {
            const text = node.textContent.trim()
            if (text) parts.push(text)
          } else if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
            node.forEach((item) => {
              const text = item.textContent.trim()
              if (text) parts.push(`• ${text}`)
            })
          } else {
            const text = node.textContent.trim()
            if (text) parts.push(text)
          }
        })
        return parts.join('\n\n')
      },
    }),
    [editor, onRewriteBookmarkHint]
  )

  useEffect(() => {
    if (!editor || content === undefined || content === null || typeof content !== 'string') return
    const trimmed = content.trim()
    if (!trimmed) return
    const isHtml = trimmed.startsWith('<')
    let toSet: string
    if (isHtml) {
      toSet = trimmed
    } else {
      toSet = plainMarkdownToDocumentHtml(trimmed)
    }
    const current = isHtml ? editor.getHTML() : editor.getText()
    if (trimmed !== current.trim()) {
      storedRangeRef.current = null
      bookmarkVisibleRef.current = false
      setBookmarkVisible(false)
      onRewriteBookmarkHint?.(false)
      try {
        editor.view.dispatch(editor.state.tr.setMeta(BOOKMARK_RANGE_META, null))
      } catch {
        // ignore
      }
      editor.commands.setContent(toSet, false)
    }
  }, [content, editor, onRewriteBookmarkHint])

  if (!editor) return null

  return (
    <div className={`resumeEditor ${bookmarkVisible ? 'resumeEditorBookmarkActive' : ''} ${className ?? ''}`}>
      <div className="resumeEditorToolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'resumeEditorBtnActive' : ''}
          title="Title (e.g. your name)"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'resumeEditorBtnActive' : ''}
          title="Section (e.g. Experience, Education)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'resumeEditorBtnActive' : ''}
          title="Subsection"
        >
          H3
        </button>
        <span className="resumeEditorToolbarDivider" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'resumeEditorBtnActive' : ''}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'resumeEditorBtnActive' : ''}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'resumeEditorBtnActive' : ''}
          title="Bullet list"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'resumeEditorBtnActive' : ''}
          title="Numbered list"
        >
          1.
        </button>
        <span className="resumeEditorToolbarDivider" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          Redo
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
})

export default ResumeEditor

export function getEditorPlainText(editor: ReturnType<typeof useEditor>): string {
  return editor?.getText() ?? ''
}

export function getEditorHtml(editor: ReturnType<typeof useEditor>): string {
  return editor?.getHTML() ?? ''
}
