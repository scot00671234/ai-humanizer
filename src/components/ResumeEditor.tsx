import { useEditor, EditorContent, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useImperativeHandle, forwardRef } from 'react'

const extensions = [StarterKit]

export type ResumeEditorHandle = {
  getSelectedText: () => string
  replaceSelection: (text: string) => void
  getText: () => string
}

type ResumeEditorProps = {
  content: Content
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
}

const ResumeEditor = forwardRef<ResumeEditorHandle, ResumeEditorProps>(function ResumeEditor(
  { content, onChange, className },
  ref
) {
  const editor = useEditor({
    extensions,
    content: content || '',
    editorProps: {
      attributes: {
        class: 'resumeEditorInner',
      },
      handleDOMEvents: {
        paste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain')
          if (text) {
            event.preventDefault()
            const { state } = view
            const tr = state.tr.insertText(text)
            view.dispatch(tr)
            return true
          }
          return false
        },
      },
    },
  })

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

  useImperativeHandle(
    ref,
    () => ({
      getSelectedText: () => {
        const { from, to } = editor?.state.selection ?? {}
        if (from == null || to == null || from === to) return ''
        return editor?.state.doc.textBetween(from, to) ?? ''
      },
      replaceSelection: (text: string) => {
        editor?.chain().focus().insertContent(text).run()
      },
      getText: () => editor?.getText() ?? '',
    }),
    [editor]
  )

  useEffect(() => {
    if (!editor || content === undefined || content === null || typeof content !== 'string') return
    const isHtml = content.trim().startsWith('<')
    const current = isHtml ? editor.getHTML() : editor.getText()
    if (content.trim() !== current.trim()) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) return null

  return (
    <div className={`resumeEditor ${className ?? ''}`}>
      <div className="resumeEditorToolbar">
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
