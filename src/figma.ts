// src/figma.ts
import axios from 'axios'
import 'dotenv/config' // 确保环境变量被加载

const figmaApi = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: {
    'X-Figma-Token': process.env.FIGMA_TOKEN,
  },
})

export async function fetchFigmaNode(
  fileKey: string,
  nodeId: string
): Promise<any> {
  try {
    console.log(`Fetching node ${nodeId} from file ${fileKey}...`)
    const response = await figmaApi.get(`/files/${fileKey}/nodes`, {
      params: { ids: nodeId },
    })
    console.log('Successfully fetched Figma data.')
    // 返回节点树中的具体节点数据
    return response.data.nodes[nodeId].document
  } catch (error) {
    console.error('Error fetching Figma data:', error)
    throw error
  }
}
