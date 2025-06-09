import OpenAI from 'openai'
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

// --- 1. 加载我们定义好的静态资源 ---

// 加载 Design Tokens，它将作为AI理解颜色、间距等样式的上下文
const designTokens = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../tokens.json'), 'utf-8')
)

// 加载 Context.json 的规范文档。
const contextSpecV1_1 = fs.readFileSync(
  path.resolve(__dirname, '../context_spec_prompt.txt'),
  'utf-8'
)

// --- 2. 初始化OpenAI客户端 ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    '[AI] OPENAI_API_KEY is not defined. AI-related functions will fail.'
  )
}

// --- 3. 核心函数：generateContext ---

/**
 * 使用大型语言模型（LLM）将原始Figma节点数据转换为符合Context.json v1.1规范的IR对象。
 *
 * @param figmaNodeData - 从Figma API获取的原始节点数据。
 * @returns 返回一个Promise，成功时解析为符合Context.json根结构的对象。
 * @throws 当AI API调用失败或返回无效的JSON时，会抛出错误。
 */
export async function generateContext(figmaNodeData: any): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'Cannot generate context because OPENAI_API_KEY is missing.'
    )
  }

  console.log('[AI] 正在将Figma数据转换为Context.json IR...')

  // --- 构建高质量的Prompt ---
  const systemPrompt = `
You are an expert Design-to-Code engineer. Your task is to convert a raw Figma node's JSON data into a structured, semantic Intermediate Representation (IR) called "Context.json".

You MUST strictly follow the provided "Context.json v1.1" specification.
You MUST also use the provided "Design Tokens" to map raw style values (like colors, spacing) to their corresponding token paths. For example, if a color is #4F46E5, you should map it to "color.brand.primary" in the IR.

The final output MUST be a single, valid JSON object that conforms to the Context.json root structure, containing the 'root' node and other necessary fields. Do not add any explanatory text outside of the JSON object.
`

  const userPrompt = `
Here is the specification for Context.json v1.1:
---SPECIFICATION---
${contextSpecV1_1}
-------------------

Here are the Design Tokens to use for mapping:
---DESIGN TOKENS---
${JSON.stringify(designTokens, null, 2)}
-------------------

Now, please convert the following raw Figma node data into a complete Context.json object:
---RAW FIGMA NODE DATA---
${JSON.stringify(figmaNodeData, null, 2)}
-----------------------
`

  try {
    // -- 发送API请求，并启用JSON Mode --
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo', // 推荐使用能力更强的模型以获得更好的结构化输出
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' }, // 开启JSON Mode，确保输出是合法的JSON
      temperature: 0.1, // 较低的温度以获得更稳定、可预测的输出
    })

    const jsonString = response.choices[0].message.content

    if (!jsonString) {
      throw new Error('AI returned an empty response.')
    }

    console.log('[AI] 成功生成Context.json IR。')
    // 解析AI返回的JSON字符串
    return jsonString
  } catch (error) {
    console.error('[AI] 生成Context.json时发生错误:', error)
    throw new Error(
      `Failed to generate Context.json from AI. Details: ${
        (error as Error).message
      }`
    )
  }
}
