import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'
import 'dotenv/config' // 确保在文件顶部导入，以加载.env变量

// --- 1. 类型定义：为Figma API的响应定义接口 ---
// 这能为我们提供强大的类型提示和代码自动补全，避免拼写错误。
interface FigmaErrorResponse {
  err: string
  status: number
}

interface FigmaNode {
  // 这里可以根据需要添加更多Figma节点的具体属性，
  // 但为了保持模块的通用性，我们暂时使用 `any`，
  // 因为我们的目标只是获取原始数据，具体的解析将在 `context.ts` 中完成。
  [key: string]: any
}

interface FigmaNodesResponse {
  nodes: {
    [nodeId: string]: {
      document: FigmaNode
      // 还可以包含 components, schemaVersion, styles 等
    } | null
  }
  err?: string
}

// --- 2. 创建一个可复用的Axios实例 ---
// 这是一种良好的实践，可以集中管理API的基础URL和认证头。
const figmaApi: AxiosInstance = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: {
    'X-Figma-Token': process.env.FIGMA_TOKEN,
  },
})

// --- 3. 核心函数：fetchFigmaNode ---

/**
 * 从Figma API获取指定文件的单个节点数据。
 *
 * @param fileKey - Figma文件的唯一标识符，可以从文件URL中获取。
 * @param nodeId - 要获取的节点的ID，同样可以从文件URL中获取。
 * @returns 返回一个Promise，成功时解析为Figma节点对象 (FigmaNode)。
 * @throws 当API请求失败或找不到节点时，会抛出错误。
 */
export async function fetchFigmaNode(
  fileKey: string,
  nodeId: string
): Promise<FigmaNode> {
  // -- 参数校验 --
  if (!process.env.FIGMA_TOKEN) {
    throw new Error(
      'FIGMA_TOKEN is not defined in your .env file. Please add it.'
    )
  }
  if (!fileKey || !nodeId) {
    throw new Error('Figma fileKey and nodeId must be provided.')
  }

  console.log(
    `[Figma] 正在从文件 (key: ${fileKey}) 中获取节点 (id: ${nodeId})...`
  )

  try {
    // -- 发送API请求 --
    const response = await figmaApi.get<FigmaNodesResponse>(
      `/files/${fileKey}/nodes`,
      {
        params: {
          ids: nodeId,
        },
      }
    )

    // -- 处理响应数据 --
    const nodeData = response.data.nodes[nodeId]

    if (!nodeData) {
      throw new Error(`Node with ID "${nodeId}" not found in the Figma file.`)
    }

    console.log('[Figma] 成功获取节点数据。')
    return nodeData.document
  } catch (error) {
    // -- 精细化的错误处理 --
    // 我们检查错误的类型，以便提供更有用的错误信息。
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<FigmaErrorResponse>
      const status = axiosError.response?.status
      const figmaErrorMsg = axiosError.response?.data?.err

      let errorMessage = `Figma API request failed with status ${status}.`

      if (status === 403) {
        errorMessage =
          'Figma API request failed (403 Forbidden). Please check if your FIGMA_TOKEN is correct and has access to the file.'
      } else if (status === 404) {
        errorMessage = `Figma API request failed (404 Not Found). Please check if the fileKey "${fileKey}" is correct.`
      } else if (figmaErrorMsg) {
        errorMessage += ` Figma's error message: "${figmaErrorMsg}"`
      }

      console.error(`[Figma] Error: ${errorMessage}`)
      throw new Error(errorMessage)
    }

    // -- 处理其他非Axios错误 --
    console.error('[Figma] An unexpected error occurred:', error)
    throw error
  }
}
