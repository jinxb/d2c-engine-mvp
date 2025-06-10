// src/enhancer.ts
import OpenAI from 'openai'
import { ParsedComponentInfo } from './parser'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * 使用AI增强组件的元数据，特别是生成 "mapsTo" 语义映射。
 * @param parsedInfo - 从Markdown解析出的基础组件信息。
 * @returns 包含完整props（含mapsTo）的对象。
 */
export async function enhanceWithAI(
  parsedInfo: ParsedComponentInfo
): Promise<Record<string, any>> {
  console.log(`[AI] Enhancing metadata for component: ${parsedInfo.name}...`)

  const systemPrompt = `
You are an expert D2C system architect. Your task is to generate the "props" section for a "metadata.json" file.
Based on the provided component's API documentation (parsed from Markdown), you need to:
1.  Structure each prop with "type", "defaultValue", and "description".
2.  For props that control visual appearance (like "type", "size", "shape"), generate a "mapsTo" object.
3.  The "mapsTo" object should define rules that map a Figma node's visual characteristics (like "figma.backgroundColor" or "figma.height") to this prop's specific values.
4.  If a characteristic relates to a design token, use the format "token:path.to.token". Otherwise, use raw values (e.g., for height).

The final output MUST be a single, valid JSON object representing the complete "props" for the metadata file.
`

  const userPrompt = `
Component Name: ${parsedInfo.name}
Component Description: ${parsedInfo.description}

Parsed Props Table:
${JSON.stringify(parsedInfo.props, null, 2)}

Please generate the complete, enhanced "props" JSON object now.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const jsonString = response.choices[0].message.content
    if (!jsonString) throw new Error('AI returned an empty response.')

    return JSON.parse(jsonString)
  } catch (error) {
    console.error(`[AI] Failed to enhance component ${parsedInfo.name}:`, error)
    throw error
  }
}
