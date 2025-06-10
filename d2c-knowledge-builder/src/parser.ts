// src/parser.ts
import { marked } from 'marked'

export interface ParsedComponentInfo {
  name: string
  description: string
  props: Record<string, string>[]
  events: Record<string, string>[]
  slots: Record<string, string>[]
}

/**
 * 解析单个组件的Markdown文档，提取其API信息。
 * @param markdownContent - Markdown文件的文本内容。
 * @returns 解析后的结构化信息对象。
 */
export function parseComponentMarkdown(
  markdownContent: string
): ParsedComponentInfo {
  const tokens = marked.lexer(markdownContent)

  const result: Partial<ParsedComponentInfo> = {
    props: [],
    events: [],
    slots: [],
  }

  result.name = (
    tokens.find(
      (t) => t.type === 'heading' && t.depth === 3
    ) as marked.Tokens.Heading
  )?.text
  result.description = (
    tokens.find((t) => t.type === 'paragraph') as marked.Tokens.Paragraph
  )?.text

  let currentSection: 'props' | 'events' | 'slots' | null = null
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 5) {
      if (token.text.toLowerCase().includes('props')) currentSection = 'props'
      else if (token.text.toLowerCase().includes('事件'))
        currentSection = 'events'
      else if (token.text.toLowerCase().includes('插槽'))
        currentSection = 'slots'
      else currentSection = null
    }

    if (token.type === 'table' && currentSection) {
      const headers = token.header.map((h) => h.text.trim())
      const rows = token.rows.map((row) => {
        const rowData: Record<string, string> = {}
        row.forEach((cell, index) => {
          rowData[headers[index]] = cell.text.trim()
        })
        return rowData
      })
      result[currentSection]?.push(...rows)
    }
  }

  return result as ParsedComponentInfo
}
