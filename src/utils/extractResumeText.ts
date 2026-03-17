/**
 * Extract plain text from resume file uploads for the editor.
 * Supports: .txt, .pdf, .docx, .doc, .odt (Word, Google Docs export, Open Office).
 * PDF: text layer only (no OCR). Max 20 pages.
 */

import mammoth from 'mammoth'
import JSZip from 'jszip'

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const DOC_MIME = 'application/msword'
const ODT_MIME = 'application/vnd.oasis.opendocument.text'
const TEXT_MIME = 'text/plain'

/** Max pages for PDF uploads (avoids timeouts and keeps UX fast). */
export const MAX_PDF_PAGES = 20

/** Max file size 15MB to avoid browser slowness. */
const MAX_FILE_BYTES = 15 * 1024 * 1024

/** ODT content.xml namespace for text elements */
const ODT_TEXT_NS = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  const { getDocument, GlobalWorkerOptions } = pdfjsLib
  // Vite: resolve worker URL so it's bundled
  if (!GlobalWorkerOptions.workerSrc) {
    const workerModule = await import('pdfjs-dist/build/pdf.worker.mjs?url')
    GlobalWorkerOptions.workerSrc = workerModule.default
  }
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const numPages = pdf.numPages
  if (numPages > MAX_PDF_PAGES) {
    throw new Error(
      `This PDF has ${numPages} pages. Maximum is ${MAX_PDF_PAGES} pages. You can copy and paste the text into the editor below instead.`
    )
  }
  const parts: string[] = []
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(pageText)
  }
  return parts.join('\n\n').trim()
}

async function extractDocxOrDocText(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer })
  return (result.value ?? '').trim()
}

async function extractOdtText(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const contentFile = zip.file('content.xml')
  if (!contentFile) return ''
  const xml = await contentFile.async('string')
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const paragraphs = doc.getElementsByTagNameNS(ODT_TEXT_NS, 'p')
  const headings = doc.getElementsByTagNameNS(ODT_TEXT_NS, 'h')
  const parts: string[] = []
  const collect = (list: HTMLCollectionOf<Element>) => {
    for (let i = 0; i < list.length; i++) {
      const el = list[i]
      const text = el?.textContent?.trim()
      if (text) parts.push(text)
    }
  }
  collect(headings)
  collect(paragraphs)
  return parts.join('\n\n').trim()
}

/**
 * Extract plain text from an uploaded resume file.
 * Supported: .txt, .pdf, .doc, .docx, .odt (Word, Google Docs, Open Office).
 * PDF: up to MAX_PDF_PAGES pages. File size limit applies.
 */
export async function extractResumeText(file: File): Promise<string> {
  const type = file.type
  const name = (file.name || '').toLowerCase()

  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      'This file is too large. Use a shorter document or copy and paste the text into the editor below.'
    )
  }

  if (type === TEXT_MIME || name.endsWith('.txt')) {
    return readFileAsText(file)
  }

  const arrayBuffer = await readFileAsArrayBuffer(file)

  if (type === PDF_MIME || name.endsWith('.pdf')) {
    return extractPdfText(arrayBuffer)
  }

  if (type === DOCX_MIME || type === DOC_MIME || name.endsWith('.docx') || name.endsWith('.doc')) {
    return extractDocxOrDocText(arrayBuffer)
  }

  if (type === ODT_MIME || name.endsWith('.odt')) {
    return extractOdtText(arrayBuffer)
  }

  throw new Error(
    `Unsupported file type. Use Word (.doc, .docx), Google Docs (export as .docx), Open Office (.odt), PDF, or Text (.txt). You can also paste your text into the editor below.`
  )
}

/** Accept attribute for file input */
export const RESUME_UPLOAD_ACCEPT = '.txt,.pdf,.doc,.docx,.odt'
