import OpenAI from 'openai'
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

// --- 1. 加载静态资源 ---
const designTokens = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../tokens.json'), 'utf-8')
)

// --- 2. 初始化OpenAI客户端 ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// --- 3. 定义支持的目标类型 ---
export type TargetFramework = 'React' | 'Vue'

// --- 4. 核心函数：generateCode ---

/**
 * 根据Context.json IR，为指定的前端框架生成组件代码。
 *
 * @param context - 符合Context.json v1.1规范的IR对象。
 * @param target - 目标框架，'React' 或 'Vue'。
 * @returns 返回一个Promise，成功时解析为生成的代码字符串。
 * @throws 当AI API调用失败时，会抛出错误。
 */
export async function generateCode(
  context: any,
  target: TargetFramework
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Cannot generate code because OPENAI_API_KEY is missing.')
  }

  console.log(`[CodeGen] 正在为 ${target} 生成组件代码...`)

  // --- 构建高质量的Prompt ---
  const systemPrompt = `
You are an expert front-end developer specializing in ${target} and TailwindCSS. Your task is to write a high-quality, reusable, single-file component based on a provided "Context.json" Intermediate Representation.

**Key Instructions:**
1.  **Framework:** Generate code for ${target} using TypeScript (e.g., <script setup> for Vue, functional components with hooks for React).
2.  **Styling:** Use TailwindCSS utility classes for all styling.
3.  **Token Mapping:** You are provided with a "Design Tokens" JSON. When you see a token reference in the IR (e.g., in \`metadata.tokens\`), you MUST map it to a corresponding Tailwind class. For example, a color token \`color.brand.primary\` might map to \`bg-brand-primary\` or \`text-brand-primary\`. Use your knowledge of common Tailwind configurations.
4.  **Props:** The generated component should accept props (like \`imageUrl\`, \`username\`) to be reusable, rather than hardcoding content. Infer appropriate prop types from the provided context.
5.  **Cleanliness:** The output should be ONLY the code for the component file. Do not include any explanatory text, markdown formatting, or anything else outside the code.
`

  const userPrompt = `
Here are the Design Tokens for mapping to TailwindCSS classes:
---DESIGN TOKENS---
${JSON.stringify(designTokens, null, 2)}
-------------------

Now, generate a ${target} component from the following Context.json object:
---CONTEXT.JSON---
${JSON.stringify(context, null, 2)}
------------------
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    })

    const code = response.choices[0].message.content

    if (!code) {
      throw new Error('AI returned empty code.')
    }

    console.log(`[CodeGen] 成功为 ${target} 生成代码。`)
    // 通常AI返回的代码会包含markdown代码块，这里做一个简单的清理
    return code
      .replace(/```(tsx|vue|jsx|html)?\n/g, '')
      .replace(/```/g, '')
      .trim()
  } catch (error) {
    console.error(`[CodeGen] 为 ${target} 生成代码时发生错误:`, error)
    throw new Error(
      `Failed to generate ${target} code from AI. Details: ${
        (error as Error).message
      }`
    )
  }
}
