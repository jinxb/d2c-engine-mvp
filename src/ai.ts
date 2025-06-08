// src/ai.ts
import OpenAI from 'openai'
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 读取Design Tokens
const designTokens = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../tokens.json'), 'utf-8')
)

export async function generateIR(figmaData: any): Promise<any> {
  console.log('Generating IR from Figma data...')

  const prompt = `
# INSTRUCTION
Analyze the provided raw Figma node data and the Design Tokens JSON. Your task is to convert the Figma data into our standard Component Intermediate Representation (IR) JSON format.

# TASKS
1. Infer Component Name: Determine the semantic component name from the Figma node's name and structure.
2. Map Styles to Tokens: For every style property (colors, radius, spacing, fonts), find the corresponding path in the Design Tokens.
3. Extract Layout: Convert Figma's Auto Layout properties into our flexbox-based layout model.
4. Parse Properties: Extract component variants from the Figma node name.
5. Structure Output: Generate a single JSON object that strictly follows the provided IR Schema. The output must be a valid JSON object only.

# CONTEXT: DESIGN TOKENS
${JSON.stringify(designTokens, null, 2)}

# INPUT: RAW FIGMA DATA
${JSON.stringify(figmaData, null, 2)}

# OUTPUT
Your response should be only the final IR JSON object.
  `

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo', // 或 gpt-3.5-turbo
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }, // 使用JSON模式确保输出格式
    })

    console.log('Successfully generated IR.')
    const irContent = response.choices[0].message.content
    return JSON.parse(irContent!)
  } catch (error) {
    console.error('Error generating IR:', error)
    throw error
  }
}

export async function generateCode(ir: any): Promise<string> {
  console.log('Generating React component from IR...')

  const prompt = `
# INSTRUCTION
You are an expert React developer. Your task is to generate a reusable React component as a single \`.tsx\` file based on the provided Component IR and Design Tokens.

# CONTEXT
1. Technology Stack: React with TypeScript and TailwindCSS.
2. Design Tokens: The provided \`tokens.json\`. Map token paths to TailwindCSS utility classes. For example, \`tokens.colors.brand.primary\` becomes \`bg-brand-primary\`. Assume Tailwind is configured to understand these token names.
3. Component IR: The provided JSON IR object which describes the component to be built.

# REQUIREMENTS
1. File Name: The component should be named after \`componentName\` from the IR.
2. Props: Create a TypeScript \`interface\` for the component's props.
3. Styling: Use TailwindCSS utility classes exclusively for styling.
4. Documentation: Add JSDoc comments for the component and its props.
5. Best Practices: Use a functional component.

# CONTEXT: DESIGN TOKENS
${JSON.stringify(designTokens, null, 2)}

# INPUT: COMPONENT IR
${JSON.stringify(ir, null, 2)}

# OUTPUT
Your response should be only the code for the React component file, formatted correctly within a single code block.
  `

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
    })

    console.log('Successfully generated React code.')
    // 通常代码在markdown块中，需要简单提取
    const codeContent = response.choices[0].message.content || ''
    return codeContent.replace(/```tsx\n|```/g, '').trim()
  } catch (error) {
    console.error('Error generating code:', error)
    throw error
  }
}
