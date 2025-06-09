(function() {
  'use strict';

  // ===================================================================
  // SECTION 1: 外部化配置 (Configuration)
  // 优化点: 将硬编码的映射和列表抽离，便于维护和未来扩展。
  // 在实际插件中，这部分数据可以从远程服务器获取，或在插件启动时注入。
  // ===================================================================

  const CONFIG = {
    // 静态组件映射，用于将业务组件的图层名直接映射为最终的组件类型
    STATIC_COMPONENT_MAP: {
      '双列商卡': 'FeedsCard',
      '券': 'Coupon',
      '优惠券': 'Coupon',
      '优惠券卡片': 'Coupon',
      '优惠券卡': 'Coupon',
    },
    // 庞大的图标列表，未来应从配置服务器加载
    ICON_NAME_LIST: new Set([
      "NotePymkC", "ContactBlueC", "CapaEdittextEdit", /* ... 超过400个图标名 ... */, "ComplaintB"
    ]),
    // 需要在遍历中被忽略的特殊图层名
    SPECIAL_NAME_LIST: ["StatusBar", "SafeAreaView", "Status Bar", "Indicator", "indicator"],
  };


  // ===================================================================
  // SECTION 2: 纯粹的工具函数 (Pure Utility Functions)
  // 优化点: 保持工具函数的纯粹性和可复用性。
  // ===================================================================

  /**
   * 检查一个值是否为空（null, undefined, 0, 空数组, 空字符串, 空对象）。
   */
  function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'number' && value === 0) return true; // 注意：我们保留数字0，这通常是有意义的
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return isPlainObject(value) && Object.keys(value).length === 0;
  }

  /**
   * 判断一个值是否为纯粹的JavaScript对象。
   */
  function isPlainObject(value) {
    if (typeof value !== 'object' || value === null) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /**
   * 深度递归地移除对象中的空值字段。
   * @param {object} obj - 需要清理的对象。
   * @returns {object} - 清理后的新对象。
   */
  function removeEmptyFields(obj) {
    if (!isPlainObject(obj)) return obj;
    const result = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (isPlainObject(value)) {
        const cleanObj = removeEmptyFields(value);
        if (Object.keys(cleanObj).length > 0) {
          result[key] = cleanObj;
        }
      } else if (!isEmptyValue(value)) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * 将RGB颜色对象转换为HEX字符串。
   * @param {number} r - Red (0-1).
   * @param {number} g - Green (0-1).
   * @param {number} b - Blue (0-1).
   * @returns {string} - #RRGGBB格式的颜色字符串。
   */
  function rgbToHex(r, g, b) {
    const toHex = (value) => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }


  // ===================================================================
  // SECTION 3: 节点解析器 (Node Parser)
  // 优化点: 将所有与解析单个Figma节点相关的逻辑，都封装在这个模块中。
  // 这符合单一职责原则，使得代码更清晰、更易于维护。
  // ===================================================================
  
  const NodeParser = {
    /**
     * 获取节点的基础几何属性。
     */
    getRect(node) {
      return {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      };
    },
    
    /**
     * 解析节点的内边距，并智能合并为padding, paddingHorizontal, paddingVertical。
     */
    getPadding(node) {
      const layout = node.inferredAutoLayout;
      if (!layout) return {};
      const { paddingLeft: pl = 0, paddingRight: pr = 0, paddingTop: pt = 0, paddingBottom: pb = 0 } = layout;
      
      const ph = (pl === pr) ? pl : undefined;
      const pv = (pt === pb) ? pt : undefined;

      if (ph !== undefined && ph === pv) {
        return { padding: ph };
      }
      
      return {
        paddingHorizontal: ph,
        paddingVertical: pv,
        paddingLeft: ph === undefined ? pl : undefined,
        paddingRight: ph === undefined ? pr : undefined,
        paddingTop: pv === undefined ? pt : undefined,
        paddingBottom: pv === undefined ? pb : undefined,
      };
    },

    /**
     * 解析节点的圆角，并智能合并为borderRadius。
     */
    getBorderRadius(node) {
      const { topLeftRadius: tl = 0, topRightRadius: tr = 0, bottomLeftRadius: bl = 0, bottomRightRadius: br = 0 } = node;
      const isSame = tl === tr && tl === bl && tl === br;
      return {
        borderRadius: isSame ? tl : undefined,
        borderTopLeftRadius: isSame ? undefined : tl,
        borderTopRightRadius: isSame ? undefined : tr,
        borderBottomLeftRadius: isSame ? undefined : bl,
        borderBottomRightRadius: isSame ? undefined : br,
      };
    },

    /**
     * 解析节点的边框样式。
     */
    getBorders(node) {
      if (!node.strokes || node.strokes.length === 0) return {};
      
      const stroke = node.strokes[0];
      if (stroke.type !== 'SOLID' || !stroke.visible) return {};

      return {
        borderWidth: node.strokeWeight,
        borderColor: rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b),
        borderStyle: 'solid', // Figma API目前只支持solid
      };
    },
    
    /**
     * 解析节点的背景颜色。
     */
    getBackground(node) {
        if (!node.fills || node.fills.length === 0) return {};
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.visible) {
            return { backgroundColor: rgbToHex(fill.color.r, fill.color.g, fill.color.b) };
        }
        return {};
    },
    
    /**
     * 异步解析文本节点的Token信息。
     * @returns {object} - { font: 'TokenName', color: 'TokenName' }
     */
    async getTextTokens(node) {
      // 优化点: 使用try-catch包裹异步操作，并对变量解析做更健壮的判断。
      try {
        const variables = node.boundVariables;
        if (!variables) return {};

        const fontVariableId = variables.fontSize?.id || variables.lineHeight?.id;
        const colorVariableId = variables.fills?.[0]?.id;

        const [fontVariable, colorVariable] = await Promise.all([
          fontVariableId ? figma.variables.getVariableByIdAsync(fontVariableId) : Promise.resolve(null),
          colorVariableId ? figma.variables.getVariableByIdAsync(colorVariableId) : Promise.resolve(null),
        ]);
        
        return {
          font: fontVariable?.name,
          color: colorVariable?.name
        };
      } catch (e) {
        console.error(`[Parser] Error getting text tokens for node ${node.id}:`, e);
        return {};
      }
    },
    
    /**
     * 检查一个节点是否应被视为一个“资源”（如图标或单张图片）。
     * 优化点: 逻辑更清晰，递归调用自身来检查。
     */
    isAsset(node) {
        if (node.isAsset) return true;
        // 如果节点只有一个子节点，且该子节点是资源，那么父节点也视为资源容器。
        if ("children" in node && node.children.length === 1) {
            return this.isAsset(node.children[0]);
        }
        return false;
    },

    /**
     * 检查一个图层名是否代表一个图标。
     * @returns {object} - { isIcon: boolean, name: string }
     */
    getIconInfo(name) {
      // 优化点: 将图标名称的格式化和检查逻辑封装在一起。
      let realName = name;
      const prefixes = ["icon/", "Icon/", "ICON/", "icon-", "Icon-", "ICON-", "icon_", "Icon_", "ICON_"];
      for (const prefix of prefixes) {
        if (name.startsWith(prefix)) {
          realName = name.slice(prefix.length);
          break;
        }
      }
      
      const pascalCase = realName.replace(/_(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
      
      if (CONFIG.ICON_NAME_LIST.has(pascalCase)) {
        return { isIcon: true, name: pascalCase };
      }
      return { isIcon: false, name: '' };
    },
    
    /**
     * 判断一个节点在视觉上是否可见。
     * 优化点: 逻辑更健壮，判断更全面。
     */
    isVisible(node) {
        if (!node.visible) return false;
        
        // 有尺寸或有填充/描边即视为可见
        const hasSize = node.width > 1 || node.height > 1;
        const hasFill = 'fills' in node && Array.isArray(node.fills) && node.fills.length > 0 && node.fills[0].visible;
        const hasStroke = 'strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0 && node.strokes[0].visible;
        
        if (hasSize || hasFill || hasStroke) return true;

        // 如果自身不可见，但有可见的子节点，也视为可见（作为容器）
        if ("children" in node && node.children.length > 0) {
            return node.children.some(child => this.isVisible(child));
        }

        return false;
    },

    /**
     * 检查一个节点名是否是需要忽略的特殊名称。
     */
    isSpecialNode(name) {
      return CONFIG.SPECIAL_NAME_LIST.some(specialName => name.includes(specialName));
    }
  };


  // ===================================================================
  // SECTION 4: 资源提取器 (Asset Extractor)
  // 优化点: 将所有与资源导出相关的异步操作封装起来。
  // ===================================================================

  const AssetExtractor = {
    /**
     * 异步导出节点的PNG预览图。
     */
    async getNodePreview(node) {
      try {
        return await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 2 }, // 使用2倍图以平衡质量和大小
        });
      } catch (err) {
        console.error(`[Assets] Failed to export preview for node ${node.id}:`, err);
        return null;
      }
    }
  };


  // ===================================================================
  // SECTION 5: 核心DSL生成器 (Core DSL Generator)
  // 优化点: 这是最大的重构。采用函数式思想，消除全局状态依赖。
  // ===================================================================

  /**
   * 核心递归函数，将Figma节点树转换为我们的自定义DSL。
   * @param {SceneNode} node - 当前处理的Figma节点。
   * @param {object} context - 递归上下文，包含父节点信息等。
   * @returns {Promise<{dslNode: object | null, assets: {icons: [], images: []}}>} - 返回生成的DSL节点和提取出的资源。
   */
  async function generateDslNode(node, context = {}) {
    // --- 1. 前置检查 (Pre-flight Checks) ---
    if (!NodeParser.isVisible(node) || NodeParser.isSpecialNode(node.name)) {
      return { dslNode: null, assets: { icons: [], images: [] } };
    }

    // --- 2. 初始化DSL节点和资源累加器 ---
    let dslNode = {
      type: 'Frame', // 默认类型
      id: node.id,
      name: node.name,
      properties: {},
      style: {},
      children: [],
    };
    let assets = { icons: [], images: [] };
    
    // --- 3. 基础属性与样式解析 ---
    dslNode.properties.rect = NodeParser.getRect(node);
    dslNode.style = {
      ...NodeParser.getBackground(node),
      ...NodeParser.getBorders(node),
      ...NodeParser.getBorderRadius(node),
      ...NodeParser.getPadding(node),
    };

    // --- 4. 按节点类型进行特定处理 (Type-specific Processing) ---
    
    // --- 处理容器类型 (Frame, Component, Instance, Group) ---
    if (['FRAME', 'COMPONENT', 'INSTANCE'].includes(node.type)) {
      const layout = node.inferredAutoLayout;
      if (layout) {
        dslNode.style.flexDirection = layout.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
        dslNode.style.gap = layout.itemSpacing;
        dslNode.style.justifyContent = layout.primaryAxisAlignItems;
        dslNode.style.alignItems = layout.counterAxisAlignItems;
      }
    }
    
    // --- 处理文本类型 (Text) ---
    if (node.type === 'TEXT') {
      dslNode.type = 'Text';
      dslNode.properties.content = node.characters;
      // 异步获取Token
      const textTokens = await NodeParser.getTextTokens(node);
      dslNode.properties.token = textTokens;
      // 文本特有样式
      dslNode.style.fontSize = node.fontSize;
      dslNode.style.fontWeight = node.fontWeight;
      dslNode.style.lineHeight = node.lineHeight;
      dslNode.style.textAlign = node.textAlignHorizontal;
    }
    
    // --- 处理资源类型 (Asset: Image/Icon) ---
    const isAsset = NodeParser.isAsset(node);
    if (isAsset) {
      const iconInfo = NodeParser.getIconInfo(node.name);
      const previewBytes = await AssetExtractor.getNodePreview(node);
      
      if (iconInfo.isIcon) {
        dslNode.type = 'Icon';
        dslNode.properties.iconName = iconInfo.name;
        if (previewBytes) {
          assets.icons.push({ id: node.id, name: iconInfo.name, bytes: previewBytes });
        }
      } else {
        dslNode.type = 'Image';
        // 未来可以在此通过AI获取图片的语义描述
        // dslNode.properties.semantic = { desc: await getSemanticDesc(previewBytes) };
        if (previewBytes) {
          assets.images.push({ id: node.id, name: node.name, bytes: previewBytes });
        }
      }
    }

    // --- 5. 静态组件映射 (Static Component Mapping) ---
    const staticType = CONFIG.STATIC_COMPONENT_MAP[node.name];
    if (staticType) {
      dslNode.type = staticType;
      // 如果是静态组件，通常我们不希望再递归其内部细节，因为它们应该被作为一个整体来处理。
      // 除非我们需要从内部提取内容，这需要更复杂的逻辑。
      // 为保持简单，我们在这里停止递归。
    } else if ('children' in node && !isAsset) {
      // --- 6. 递归处理子节点 (Recursive Processing) ---
      // 优化点: 使用Promise.all来并行处理子节点的异步解析，提升效率。
      const childResults = await Promise.all(node.children.map(child => generateDslNode(child, context)));

      for (const result of childResults) {
        if (result.dslNode) {
          dslNode.children.push(result.dslNode);
        }
        assets.icons.push(...result.assets.icons);
        assets.images.push(...result.assets.images);
      }
    }
    
    // --- 7. 清理与返回 (Cleanup & Return) ---
    // 如果一个容器节点在递归后没有任何可见的子节点，且自身也无内容，则忽略它。
    if (dslNode.children.length === 0 && dslNode.type === 'Frame' && !dslNode.properties.content && isEmptyValue(dslNode.style.backgroundColor)) {
        return { dslNode: null, assets };
    }
    
    dslNode.style = removeEmptyFields(dslNode.style);
    dslNode.properties = removeEmptyFields(dslNode.properties);
    if (dslNode.children.length === 0) delete dslNode.children;

    return { dslNode: removeEmptyFields(dslNode), assets };
  }

  // ===================================================================
  // SECTION 6: 主流程控制器 (Main Controller)
  // 优化点: 作为顶层入口，负责编排、调用核心逻辑，并与UI通信。
  // ===================================================================

  const MainController = {
    /**
     * 主入口函数，根据模式生成DSL。
     */
    async generateDSL(mode, layoutMode, id) {
      if (!id) {
        console.error('[Controller] Error: Node ID is missing.');
        return;
      }
      
      const rootNode = await figma.getNodeByIdAsync(id);
      if (!rootNode) {
        console.error(`[Controller] Error: Node with ID ${id} not found.`);
        return;
      }

      console.log(`[Controller] Starting DSL generation for node ${id} in "${mode}" mode.`);
      
      const { dslNode, assets } = await generateDslNode(rootNode);
      
      if (!dslNode) {
        console.error('[Controller] Failed to generate a valid DSL structure.');
        figma.ui.postMessage({ type: 'generate-dsl-error', payload: { message: 'The selected node resulted in an empty output.' }});
        return;
      }
      
      // 可以在这里根据mode和layoutMode对根节点的DSL进行最后的调整
      // ... (例如，添加页面级的flex:1等样式)

      console.log('[Controller] DSL generation successful. Posting message to UI.');
      figma.ui.postMessage({
        type: 'generate-dsl-success',
        payload: {
          dsl: dslNode,
          assets: assets,
        },
      });
    },

    /**
     * 获取当前选中的节点信息，并发送给UI层。
     */
    async updateSelectionInfo() {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.ui.postMessage({ type: 'selection-change', payload: { hasSelection: false, list: [] } });
        return;
      }

      const selectionInfo = await Promise.all(selection.map(async (node) => {
        // 只为符合条件的节点生成预览图
        if (['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'].includes(node.type)) {
          const imageBytes = await AssetExtractor.getNodePreview(node);
          return {
            id: node.id,
            name: node.name,
            image: imageBytes,
          };
        }
        return { id: node.id, name: node.name, image: null };
      }));
      
      figma.ui.postMessage({
        type: 'selection-change',
        payload: {
          hasSelection: true,
          list: selectionInfo.filter(Boolean),
        },
      });
    },
    
    /**
     * 根据ID选中Figma画布上的节点。
     */
    async selectNodeById(id) {
        if (!id) return;
        const node = await figma.getNodeByIdAsync(id);
        if (node) {
            figma.currentPage.selection = [node];
            figma.viewport.scrollAndZoomIntoView([node]);
        }
    },
    
    // ... 其他控制器函数，如 openUrl, storage anagement ...
  };

  
  // ===================================================================
  // SECTION 7: 事件监听与插件初始化 (Event Listeners & Initialization)
  // ===================================================================
  
  // 显示插件UI
  figma.showUI(__html__, { width: 400, height: 600 }); // 给UI一个合适的默认尺寸

  // 设置消息监听器，作为UI和主逻辑之间的桥梁
  figma.ui.onmessage = (msg) => {
    if (!msg || !msg.type) return;
    
    console.log(`[Event] Received message from UI:`, msg.type);

    switch (msg.type) {
      case 'generate-dsl':
        MainController.generateDSL(msg.mode, msg.layoutMode, msg.id);
        break;
      case 'get-selection':
        MainController.updateSelectionInfo();
        break;
      case 'select-node':
        MainController.selectNodeById(msg.id);
        break;
      // ... 其他case ...
      default:
        console.warn(`[Event] Unknown message type: ${msg.type}`);
    }
  };

  // 监听Figma的选择变化事件，实现实时更新
  figma.on('selectionchange', () => {
    console.log('[Event] Selection changed.');
    MainController.updateSelectionInfo();
  });
  
  // 插件启动时，立即获取一次当前选择
  MainController.updateSelectionInfo();

})();