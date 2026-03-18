import { useEditor, EditorContent, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useImperativeHandle, forwardRef, useRef } from 'react'

const extensions = [StarterKit]

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
  return normalized.split('\n').map((line) => {
    const inner = inlineMarkdownToHtml(line)
    return `<p>${inner || '<br>'}</p>`
  }).join('')
}

export type ResumeEditorHandle = {
  getSelectedText: () => string
  replaceSelection: (text: string) => void
  getText: () => string
  /** Insert HTML or plain text at the start of the document (e.g. for generated summary). */
  insertContentAtStart: (htmlOrText: string) => void
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
      lastMousedownInProseRef.current = proseEl.contains(t)
      if (root.contains(t)) return
      const { from, to } = editor.state.selection
      if (from !== to) {
        storedRangeRef.current = { from, to }
        onRewriteBookmarkHint?.(true)
        notify()
      }
    }

    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        storedRangeRef.current = { from, to }
      } else if (editor.isFocused && lastMousedownInProseRef.current) {
        storedRangeRef.current = null
        onRewriteBookmarkHint?.(false)
      }
      notify()
    }

    const onBlur = () => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        storedRangeRef.current = { from, to }
        onRewriteBookmarkHint?.(true)
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
        onRewriteBookmarkHint?.(false)
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
      onRewriteBookmarkHint?.(false)
      editor.commands.setContent(toSet, false)
    }
  }, [content, editor, onRewriteBookmarkHint])

  if (!editor) return null

  return (
    <div className={`resumeEditor ${className ?? ''}`}>
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
