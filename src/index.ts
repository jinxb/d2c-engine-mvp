// src/index.ts
import { fetchFigmaNode } from './figma'
import { generateIR, generateCode } from './ai'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const fileKey = process.env.FIGMA_FILE_KEY!
  const nodeId = process.env.FIGMA_NODE_ID!

  if (!fileKey || !nodeId) {
    console.error(
      'Please provide FIGMA_FILE_KEY and FIGMA_NODE_ID in your .env file.'
    )
    return
  }

  try {
    // 步骤1: 从Figma获取原始数据
    const figmaData = await fetchFigmaNode(fileKey, nodeId)
    fs.writeFileSync(
      'output-figma-raw.json',
      JSON.stringify(figmaData, null, 2)
    )
    console.log('Saved raw Figma data to output-figma-raw.json')

    // 步骤2: AI生成IR
    const componentIR = await generateIR(figmaData)
    fs.writeFileSync(
      'output-component-ir.json',
      JSON.stringify(componentIR, null, 2)
    )
    console.log('Saved component IR to output-component-ir.json')

    // 步骤3: AI生成代码
    const reactCode = await generateCode(componentIR)
    const componentName = componentIR.componentName || 'MyComponent'
    const outputDir = path.resolve(__dirname, '../components')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir)
    }
    fs.writeFileSync(path.join(outputDir, `${componentName}.tsx`), reactCode)
    console.log(
      `Successfully generated component and saved to components/${componentName}.tsx`
    )

    console.log('\n✅ D2C pipeline finished successfully!')
  } catch (error) {
    console.error('\n❌ D2C pipeline failed:', error)
  }
}

main()
