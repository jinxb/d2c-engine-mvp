// src/index.ts
import { Command } from 'commander'
import { glob } from 'glob'
import fs from 'fs/promises'
import path from 'path'
import 'dotenv/config'
import { parseComponentMarkdown, ParsedComponentInfo } from './parser'
import { enhanceWithAI } from './enhancer'

const program = new Command()

program
  .name('d2c-knowledge-builder')
  .description(
    'A CLI tool to automatically build a component knowledge base from Markdown documents.'
  )
  .version('1.0.0')

program
  .command('build')
  .description('Build the knowledge base')
  .option(
    '-s, --source <path>',
    'Path to the source Markdown documents directory',
    './docs'
  )
  .option(
    '-o, --output <path>',
    'Path to the output directory for metadata.json files',
    './knowledge-base'
  )
  .action(async (options) => {
    console.log('🚀 Starting Knowledge Base build process...')
    console.log(`Source directory: ${options.source}`)
    console.log(`Output directory: ${options.output}`)

    try {
      await fs.mkdir(options.output, { recursive: true })
      const markdownFiles = await glob(`${options.source}/**/*.md`)
      if (markdownFiles.length === 0) {
        console.warn('⚠️ No Markdown files found in the source directory.')
        return
      }

      console.log(
        `Found ${markdownFiles.length} component documents to process.`
      )

      for (const file of markdownFiles) {
        console.log(`\n--- Processing: ${file} ---`)

        const markdownContent = await fs.readFile(file, 'utf-8')
        const parsedInfo = parseComponentMarkdown(markdownContent)
        if (!parsedInfo.name) {
          console.warn(
            `Skipping file ${file} as no component name could be parsed.`
          )
          continue
        }

        const enhancedProps = await enhanceWithAI(parsedInfo)

        const finalMetadata = {
          schemaVersion: '1.1',
          name: parsedInfo.name,
          framework: 'Vue',
          source: {
            package: '@xhs/reds-h5-next',
            importStatement: `import { ${parsedInfo.name} } from '@xhs/reds-h5-next';`,
          },
          description: parsedInfo.description,
          slots: parsedInfo.slots.map((s) => ({
            name: s['名称'],
            description: s['说明'],
          })),
          props: enhancedProps,
          events: parsedInfo.events.map((e) => ({
            name: e['事件名'],
            description: e['说明'],
            params: e['回调参数'],
          })),
        }

        const outputFilename = `${parsedInfo.name.toLowerCase()}.metadata.json`
        const outputPath = path.join(options.output, outputFilename)
        await fs.writeFile(outputPath, JSON.stringify(finalMetadata, null, 2))

        console.log(
          `✅ Successfully generated metadata for ${parsedInfo.name} at ${outputPath}`
        )
      }

      console.log('\n🎉 Knowledge Base build process finished successfully!')
    } catch (error) {
      console.error('\n❌ An error occurred during the build process:', error)
      process.exit(1)
    }
  })

program.parse(process.argv)
