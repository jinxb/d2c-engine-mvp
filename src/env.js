// # ---------------------------------
// # D2C引擎环境变量配置
// # ---------------------------------

// # [必填] 你的OpenAI API密钥。
// # 获取地址: https://platform.openai.com/api-keys
// OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

// # [必填] 你的Figma个人访问令牌。
// # 获取地址: Figma > Settings > Personal access tokens
// FIGMA_TOKEN="figma_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

// # [必填] 用于本次测试的Figma文件Key。
// # 如何获取: 打开你的Figma文件，URL格式为 https://www.figma.com/file/{FILE_KEY}/{FILE_NAME}
// # 请将 {FILE_KEY} 部分复制到这里。
// FIGMA_FILE_KEY="your_figma_file_key_here"

// # [必填] 用于本次测试的具体Figma节点ID。
// # 如何获取: 在Figma中选中你想要转换的顶级Frame或Component，
// # URL会变为 https://...&node-id={NODE_ID}。请将 {NODE_ID} 部分复制到这里 (通常是xx-xx或xxx:xxx的格式)。
// # 注意：Node ID中的冒号(:)需要进行URL编码，变为%3A，但通常我们的HTTP库会自动处理，直接复制即可。
// FIGMA_TEST_NODE_ID="your_figma_node_id_here"