import { fetchFigmaNode } from './figma'
import { generateContext } from './context'
import { generateCode, TargetFramework } from './codegen'
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

// --- 主流程函数 ---

async function runD2CPipeline() {
  console.log('🚀 --- D2C引擎MVP启动 --- 🚀')

  const startTime = Date.now()

  // 1. 从.env文件中获取配置
  const fileKey = process.env.FIGMA_FILE_KEY
  const nodeId = process.env.FIGMA_TEST_NODE_ID

  if (!fileKey || !nodeId) {
    console.error(
      '❌ 错误: 请确保在 .env 文件中定义了 FIGMA_FILE_KEY 和 FIGMA_TEST_NODE_ID'
    )
    return
  }

  // 准备输出目录
  const outputDir = path.resolve(__dirname, '../output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  try {
    // --- 步骤 1: 获取Figma原始数据 ---
    console.log(fileKey, nodeId)
    const figmaNodeData = await fetchFigmaNode(fileKey, nodeId)
    fs.writeFileSync(
      path.join(outputDir, 'figma-raw-output.json'),
      JSON.stringify(figmaNodeData, null, 2)
    )
    console.log('✅ 步骤 1/3: 成功获取Figma数据并保存。')

    // --- 步骤 2: 生成Context.json IR ---
    const context = await generateContext(figmaNodeData)
    fs.writeFileSync(path.join(outputDir, 'context-output.json'), context)
    console.log('✅ 步骤 2/3: 成功生成Context.json IR并保存。')

    // --- 步骤 3: 生成目标代码 (可以同时生成多种框架) ---
    const targets: TargetFramework[] = ['React', 'Vue']

    for (const target of targets) {
      const code = await generateCode(context, target)
      const fileExtension = target === 'React' ? 'tsx' : 'vue'
      const componentName = context.root?.name || 'MyComponent'
      const outputFilePath = path.join(
        outputDir,
        `${componentName}.${target}.${fileExtension}`
      )

      fs.writeFileSync(outputFilePath, code)
      console.log(
        `✅ 步骤 3/3 [${target}]: 成功生成组件代码并保存至 ${outputFilePath}`
      )
    }

    const duration = (Date.now() - startTime) / 1000
    console.log(
      `\n🎉 --- D2C流程全部完成！耗时: ${duration.toFixed(2)}s --- 🎉`
    )
    console.log(`所有产物已保存在 \`${outputDir}\` 文件夹中。`)
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000
    console.error(`\n❌ --- D2C流程在 ${duration.toFixed(2)}s 后中断 --- ❌`)
    console.error('错误详情:', (error as Error).message)
  }
}

// --- 运行主流程 ---
runD2CPipeline()
