const fs = require('fs');
const path = require('path');

const files = {

  // ==================== 根目录配置 ====================
  'package.json': JSON.stringify({
    name: 'fenjing-fuike',
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
      tauri: 'tauri',
      'android:init': 'tauri android init',
      'android:dev': 'tauri android dev',
      'android:build': 'tauri android build --apk',
      'ios:init': 'tauri ios init',
      'ios:dev': 'tauri ios dev',
      'ios:build': 'tauri ios build'
    },
    dependencies: {
      '@tauri-apps/api': '^2',
      '@tauri-apps/plugin-http': '^2',
      '@tauri-apps/plugin-fs': '^2',
      '@tauri-apps/plugin-sql': '^2',
      '@tauri-apps/plugin-stronghold': '^2',
      '@tauri-apps/plugin-biometric': '^2',
      '@tauri-apps/plugin-camera': '^2',
      '@tauri-apps/plugin-haptics': '^2',
      '@tauri-apps/plugin-notification': '^2',
      '@tauri-apps/plugin-clipboard-manager': '^2',
      '@tauri-apps/plugin-dialog': '^2',
      '@tauri-apps/plugin-os': '^2',
      '@tauri-apps/plugin-opener': '^2',
      '@tauri-apps/plugin-deep-link': '^2',
      '@xyflow/react': '^12',
      'zustand': '^5',
      'i18next': '^23',
      'react-i18next': '^15',
      'react': '^19',
      'react-dom': '^19',
      'jszip': '^3',
      'file-saver': '^2'
    },
    devDependencies: {
      '@tauri-apps/cli': '^2',
      '@vitejs/plugin-react': '^4',
      'vite': '^6',
      'typescript': '^5',
      'tailwindcss': '^4',
      '@tailwindcss/vite': '^4',
      '@types/react': '^19',
      '@types/react-dom': '^19',
      '@types/node': '^22',
      '@types/file-saver': '^2'
    }
  }, null, 2),

  'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: '0.0.0.0' },
})`,

  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2020', useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'], module: 'ESNext',
      skipLibCheck: true, moduleResolution: 'bundler',
      allowImportingTsExtensions: true, resolveJsonModule: true,
      isolatedModules: true, noEmit: true, jsx: 'react-jsx',
      strict: true, baseUrl: '.', paths: { '@/*': ['./src/*'] }
    },
    include: ['src'], references: [{ path: './tsconfig.node.json' }]
  }, null, 2),

  'tsconfig.node.json': JSON.stringify({
    compilerOptions: { composite: true, skipLibCheck: true, module: 'ESNext', moduleResolution: 'bundler', allowSyntheticDefaultImports: true },
    include: ['vite.config.ts']
  }, null, 2),

  'index.html': `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#7c3aed" />
    <title>分镜助手</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  // ==================== 前端入口 ====================
  'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import './features/canvas/nodes'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)`,

  'src/index.css': `@import "tailwindcss";
@import "@xyflow/react/dist/style.css";

html, body, #root { height: 100%; margin: 0; }

@media (max-width: 768px) {
  .react-flow__handle {
    width: 20px !important; height: 20px !important;
    border-width: 4px !important; border-radius: 50% !important;
  }
  .react-flow__handle::after {
    content: ''; position: absolute; inset: -8px; border-radius: 50%;
  }
  .react-flow__node { font-size: 12px; touch-action: manipulation; }
  .react-flow__controls { bottom: 20px; right: 10px; }
  .react-flow__minimap { display: none; }
}

.safe-top { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-x { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }`,

  'src/App.tsx': `import { useEffect, useState } from 'react'
import { getApiKey } from '@/services/secureStorage'
import { getMembership } from '@/services/redeemService'
import { isBiometricAvailable, unlockWithBiometric } from '@/services/biometric'
import { useIsMobile } from '@/hooks/useIsMobile'
import { initDeepLink } from '@/services/deepLink'
import SettingsPage from '@/features/settings/SettingsPage'
import RedeemPage from '@/features/membership/RedeemPage'
import Canvas from '@/features/canvas/Canvas'
import MobileApp from '@/features/mobile/MobileApp'
import BiometricLockScreen from '@/features/mobile/BiometricLockScreen'

export default function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [membership, setMembership] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    initDeepLink()
    Promise.all([getApiKey(), getMembership()]).then(([key, mem]) => {
      setHasKey(!!key)
      setMembership(mem.plan)
    })
  }, [])

  useEffect(() => {
    if (hasKey === null) return
    isBiometricAvailable().then(available => {
      if (!available) { setUnlocked(true); return }
      unlockWithBiometric().then(setUnlocked)
    })
  }, [hasKey])

  if (hasKey === null) return <div className="p-8">加载中...</div>
  if (!hasKey) return <SettingsPage onSaved={() => setHasKey(true)} />
  if (!unlocked) return <BiometricLockScreen onUnlock={() => setUnlocked(true)} />
  if (membership === 'free') return <RedeemPage onSuccess={() => setMembership('pro')} />

  return isMobile ? <MobileApp /> : <Canvas />
}`,

  // ==================== Hooks ====================
  'src/hooks/useIsMobile.ts': `import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [breakpoint])
  return isMobile
}`,

  // ==================== Store ====================
  'src/stores/canvasStore.ts': `import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { applyNodeChanges, applyEdgeChanges, addEdge,
  type Node, type Edge, type NodeChange, type EdgeChange, type Connection } from '@xyflow/react'

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (c: NodeChange[]) => void
  onEdgesChange: (c: EdgeChange[]) => void
  onConnect: (c: Connection) => void
  setNodes: (n: Node[]) => void
  setEdges: (e: Edge[]) => void
  addNode: (n: Node) => void
  updateNodeData: (id: string, data: Record<string, any>) => void
  setOnGenerate: (id: string, cb: () => void) => void
  setOnGenerateImage: (id: string, cb: () => void) => void
  setOnRetryImage: (id: string, cb: () => void) => void
}

export const useCanvasStore = create<CanvasState>()(subscribeWithSelector((set, get) => ({
  nodes: [], edges: [],
  onNodesChange: c => set({ nodes: applyNodeChanges(c, get().nodes) }),
  onEdgesChange: c => set({ edges: applyEdgeChanges(c, get().edges) }),
  onConnect: c => set({ edges: addEdge(c, get().edges) }),
  setNodes: n => set({ nodes: n }),
  setEdges: e => set({ edges: e }),
  addNode: n => set({ nodes: [...get().nodes, n] }),
  updateNodeData: (id, data) => set({
    nodes: get().nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
  }),
  setOnGenerate: (id, cb) => get().updateNodeData(id, { onGenerate: cb }),
  setOnGenerateImage: (id, cb) => get().updateNodeData(id, { onGenerateImage: cb }),
  setOnRetryImage: (id, cb) => get().updateNodeData(id, { onRetryImage: cb }),
})))`,

  // ==================== 节点注册表 ====================
  'src/features/canvas/domain/nodeRegistry.ts': `import type { NodeTypes, NodeProps } from '@xyflow/react'
import type { ComponentType } from 'react'

export interface HandleDefinition { id: string; type: 'source'|'target'; position: 'left'|'right'|'top'|'bottom' }
export interface NodeTypeDefinition {
  type: string; label: string; description: string
  category: 'input'|'process'|'output'; icon?: string
  component: ComponentType<NodeProps>
  defaultData: Record<string, any>; handles: HandleDefinition[]
}
const registry = new Map<string, NodeTypeDefinition>()
export const registerNode = (d: NodeTypeDefinition) => { registry.set(d.type, d) }
export function getNodeTypes(): NodeTypes {
  const t: NodeTypes = {}; registry.forEach((d, ty) => { t[ty] = d.component }); return t
}
export const getNodeDefinition = (t: string) => registry.get(t)
export const getAllNodeDefinitions = () => Array.from(registry.values())`,

  // ==================== 节点组件 ====================
  'src/features/canvas/nodes/ScriptInputNode.tsx': `import { memo, useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

export type ScriptInputNodeType = Node<{ script: string; onGenerate?: () => void }, 'scriptInput'>

function ScriptInputNode({ data, selected }: NodeProps<ScriptInputNodeType>) {
  const [script, setScript] = useState(data.script || '')
  return (
    <div className={\`bg-white rounded-lg border-2 p-3 w-72 shadow-md \${selected ? 'border-blue-500' : 'border-gray-200'}\`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📝</span>
        <span className="text-sm font-semibold text-gray-700">剧本输入</span>
      </div>
      <textarea value={script} onChange={e => setScript(e.target.value)}
        placeholder="粘贴剧本或小说片段..." rows={5}
        className="w-full p-2 text-xs border rounded resize-none nodrag focus:outline-none focus:ring-1 focus:ring-blue-400" />
      <button onClick={() => data.onGenerate?.()}
        className="mt-2 w-full bg-blue-500 text-white text-xs py-1.5 rounded hover:bg-blue-600 nodrag">
        生成分镜
      </button>
      <Handle type="source" position={Position.Right} id="script-output" className="!bg-blue-500 !w-3 !h-3" />
    </div>
  )
}
export default memo(ScriptInputNode)`,

  'src/features/canvas/nodes/StoryboardNode.tsx': `import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { localImageUrl } from '@/services/imageStorage'

export type StoryboardNodeType = Node<{
  shotNumber: number; sceneDescription: string; cameraAngle: string; duration: number
  dialogue?: string; imagePath?: string
  imageStatus?: 'idle'|'generating'|'done'|'error'; imageError?: string
  onGenerateImage?: () => void; onRetryImage?: () => void
}, 'storyboard'>

function StoryboardNode({ data, selected }: NodeProps<StoryboardNodeType>) {
  const s = data.imageStatus || 'idle'
  return (
    <div className={\`bg-white rounded-lg border-2 w-72 shadow-md \${selected ? 'border-purple-500' : 'border-gray-200'}\`}>
      <Handle type="target" position={Position.Left} id="storyboard-input" className="!bg-purple-500 !w-3 !h-3" />
      <div className="bg-purple-50 px-3 py-1.5 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-bold text-purple-700">镜头 {data.shotNumber}</span>
        <span className="text-[10px] text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded">
          {data.cameraAngle} · {data.duration}s</span>
      </div>
      <div className="px-3 pt-3">
        {s === 'idle' && (
          <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
            <button onClick={() => data.onGenerateImage?.()}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium nodrag">点击生成画面</button>
          </div>
        )}
        {s === 'generating' && (
          <div className="aspect-video bg-purple-50 rounded flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
            <span className="text-[10px] text-purple-500 mt-2">生成中...</span>
          </div>
        )}
        {s === 'done' && data.imagePath && (
          <img src={localImageUrl(data.imagePath)} alt="" className="w-full aspect-video object-cover rounded nodrag" />
        )}
        {s === 'error' && (
          <div className="aspect-video bg-red-50 rounded flex flex-col items-center justify-center px-2">
            <span className="text-[10px] text-red-500 text-center leading-tight">{data.imageError || '生成失败'}</span>
            <button onClick={() => data.onRetryImage?.()} className="text-[10px] text-red-600 underline mt-1 nodrag">重试</button>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-700 leading-relaxed">{data.sceneDescription}</p>
        {data.dialogue && <p className="text-[10px] text-gray-400 mt-1 italic">💬 {data.dialogue}</p>}
      </div>
      <Handle type="source" position={Position.Right} id="storyboard-output" className="!bg-purple-500 !w-3 !h-3" />
    </div>
  )
}
export default memo(StoryboardNode)`,

  'src/features/canvas/nodes/ExportNode.tsx': `import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

export type ExportNodeType = Node<{ onExport?: (f: string) => void }, 'export'>

function ExportNode({ data, selected }: NodeProps<ExportNodeType>) {
  return (
    <div className={\`bg-white rounded-lg border-2 p-3 w-48 shadow-md \${selected ? 'border-green-500' : 'border-gray-200'}\`}>
      <Handle type="target" position={Position.Left} id="export-input" className="!bg-green-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📤</span>
        <span className="text-sm font-semibold text-gray-700">导出</span>
      </div>
      <div className="flex gap-1">
        {(['json', 'csv', 'txt'] as const).map(fmt => (
          <button key={fmt} onClick={() => data.onExport?.(fmt)}
            className="flex-1 text-[10px] py-1 border rounded hover:bg-gray-50 nodrag uppercase">{fmt}</button>
        ))}
      </div>
    </div>
  )
}
export default memo(ExportNode)`,

  'src/features/canvas/nodes/index.ts': `import { registerNode } from '../domain/nodeRegistry'
import ScriptInputNode from './ScriptInputNode'
import StoryboardNode from './StoryboardNode'
import ExportNode from './ExportNode'

registerNode({ type: 'scriptInput', label: '剧本输入', description: '输入小说或剧本片段',
  category: 'input', icon: '📝', component: ScriptInputNode, defaultData: { script: '' },
  handles: [{ id: 'script-output', type: 'source', position: 'right' }] })

registerNode({ type: 'storyboard', label: '分镜镜头', description: '单个镜头的分镜信息',
  category: 'process', icon: '🎬', component: StoryboardNode,
  defaultData: { shotNumber: 1, sceneDescription: '待填写画面描述', cameraAngle: '中景', duration: 3, dialogue: '' },
  handles: [{ id: 'storyboard-input', type: 'target', position: 'left' },
            { id: 'storyboard-output', type: 'source', position: 'right' }] })

registerNode({ type: 'export', label: '导出', description: '导出分镜脚本',
  category: 'output', icon: '📤', component: ExportNode, defaultData: {},
  handles: [{ id: 'export-input', type: 'target', position: 'left' }] })`,

  // ==================== 画布组件 ====================
  'src/features/canvas/Sidebar.tsx': `import { getAllNodeDefinitions, type NodeTypeDefinition } from './domain/nodeRegistry'

function NodeItem({ def }: { def: NodeTypeDefinition }) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow', def.type)
    e.dataTransfer.effectAllowed = 'move'
  }
  return (
    <div draggable onDragStart={onDragStart}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white cursor-grab hover:border-blue-400 hover:shadow-sm active:cursor-grabbing transition-all">
      <span className="text-xl">{def.icon}</span>
      <div>
        <div className="text-sm font-medium text-gray-700">{def.label}</div>
        <div className="text-[10px] text-gray-400">{def.description}</div>
      </div>
    </div>
  )
}
const LABELS: Record<string, string> = { input: '输入节点', process: '处理节点', output: '输出节点' }

export default function Sidebar() {
  const defs = getAllNodeDefinitions()
  return (
    <div className="w-56 bg-gray-50 border-r border-gray-200 p-3 overflow-y-auto">
      <h2 className="text-xs font-bold text-gray-500 uppercase mb-3">节点面板</h2>
      {['input', 'process', 'output'].map(cat => {
        const items = defs.filter(d => d.category === cat)
        if (!items.length) return null
        return (
          <div key={cat} className="mb-4">
            <div className="text-[10px] text-gray-400 uppercase mb-2">{LABELS[cat]}</div>
            <div className="space-y-2">{items.map(d => <NodeItem key={d.type} def={d} />)}</div>
          </div>
        )
      })}
    </div>
  )
}`,

  'src/features/canvas/Canvas.tsx': `import { useCallback, useEffect } from 'react'
import { ReactFlow, Background, Controls, MiniMap, useReactFlow, ReactFlowProvider,
  type Node, type Edge } from '@xyflow/react'
import { useCanvasStore } from '@/stores/canvasStore'
import { getNodeTypes, getNodeDefinition } from './domain/nodeRegistry'
import { generateStoryboard, generateImage } from '@/services/aiService'
import { downloadAndSaveImage } from '@/services/imageStorage'
import { exportAsZip, exportAsMarkdown, exportAsJson } from '@/services/exportService'
import { hapticLight, hapticMedium } from '@/services/haptics'
import Sidebar from './Sidebar'

let id = 0
const getId = () => \`node_\${id++}\`

function CanvasInner({ touchOptimized = false }: { touchOptimized?: boolean }) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges, addNode, updateNodeData } = useCanvasStore()
  const { screenToFlowPosition } = useReactFlow()

  const handleScriptGenerate = useCallback(async (scriptNodeId: string) => {
    const scriptNode = useCanvasStore.getState().nodes.find(n => n.id === scriptNodeId)
    if (!scriptNode) return
    const script = (scriptNode.data as any).script
    if (!script?.trim()) return
    try {
      const storyboard = await generateStoryboard(script)
      const baseX = scriptNode.position.x + 350
      const baseY = scriptNode.position.y
      const newNodes: Node[] = storyboard.map((s: any, i: number) => ({
        id: \`shot-\${Date.now()}-\${i}\`, type: 'storyboard',
        position: { x: baseX, y: baseY + i * 200 },
        data: { shotNumber: s.shotNumber, sceneDescription: s.sceneDescription,
          cameraAngle: s.cameraAngle, duration: s.duration, dialogue: s.dialogue || '' },
      }))
      const newEdges: Edge[] = newNodes.map(n => ({
        id: \`edge-\${scriptNodeId}-\${n.id}\`, source: scriptNodeId, sourceHandle: 'script-output',
        target: n.id, targetHandle: 'storyboard-input', animated: true,
      }))
      setNodes([...useCanvasStore.getState().nodes, ...newNodes])
      setEdges([...useCanvasStore.getState().edges, ...newEdges])
      await hapticMedium()
    } catch (e: any) { alert(e.message) }
  }, [setNodes, setEdges])

  const handleGenerateImage = useCallback(async (nodeId: string) => {
    const node = useCanvasStore.getState().nodes.find(n => n.id === nodeId)
    if (!node) return
    const { sceneDescription, cameraAngle } = node.data as any
    if (!sceneDescription) return
    updateNodeData(nodeId, { imageStatus: 'generating', imageError: undefined })
    try {
      const prompt = \`电影分镜画面，\${cameraAngle}，\${sceneDescription}，专业摄影，高质量，电影感光线\`
      const url = await generateImage(prompt)
      const p = await downloadAndSaveImage(url, nodeId)
      updateNodeData(nodeId, { imagePath: p, imageStatus: 'done' })
      await hapticMedium()
    } catch (e: any) {
      updateNodeData(nodeId, { imageStatus: 'error', imageError: e.message })
    }
  }, [updateNodeData])

  useEffect(() => {
    const store = useCanvasStore.getState()
    nodes.filter(n => n.type === 'scriptInput').forEach(n => store.setOnGenerate(n.id, () => handleScriptGenerate(n.id)))
    nodes.filter(n => n.type === 'storyboard').forEach(n => {
      store.setOnGenerateImage(n.id, () => handleGenerateImage(n.id))
      store.setOnRetryImage(n.id, () => handleGenerateImage(n.id))
    })
    nodes.filter(n => n.type === 'export').forEach(n => {
      store.updateNodeData(n.id, { onExport: (fmt: string) => {
        const cur = useCanvasStore.getState().nodes
        if (fmt === 'json') exportAsJson(cur)
        else if (fmt === 'csv') exportAsZip(cur)
        else exportAsMarkdown(cur)
      }})
    })
  }, [nodes.length, handleScriptGenerate, handleGenerateImage])

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type) return
    const def = getNodeDefinition(type)
    if (!def) return
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addNode({ id: getId(), type, position: pos, data: { ...def.defaultData } })
    hapticLight()
  }, [screenToFlowPosition, addNode])

  const touchProps = touchOptimized ? {
    connectOnClick: true, connectionRadius: 40, autoPanOnConnect: true,
    zoomOnScroll: false, zoomOnPinch: true, panOnScroll: false,
    nodeDragThreshold: 8, onlyRenderVisibleElements: true,
  } : {}

  return (
    <div className="flex w-screen h-screen">
      {!touchOptimized && <Sidebar />}
      <div className="flex-1">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange} onConnect={onConnect}
          onDragOver={onDragOver} onDrop={onDrop}
          nodeTypes={getNodeTypes()} fitView {...touchProps}>
          <Background /><Controls />{!touchOptimized && <MiniMap />}
        </ReactFlow>
      </div>
    </div>
  )
}

export default function Canvas(props: { touchOptimized?: boolean }) {
  return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>
}`,

  // ==================== 移动端 ====================
  'src/features/mobile/MobileApp.tsx': `import { useState } from 'react'
import MobileStoryboardList from './MobileStoryboardList'
import MobileCanvas from './MobileCanvas'
import MobileCreatePage from './MobileCreatePage'
import MobileCharacterManager from './MobileCharacterManager'
import MobileBottomNav, { type TabKey } from './MobileBottomNav'

export default function MobileApp() {
  const [tab, setTab] = useState<TabKey>('list')
  return (
    <div className="flex flex-col w-screen h-screen bg-gray-50">
      <div className="flex-1 overflow-y-auto safe-top">
        {tab === 'list' && <MobileStoryboardList />}
        {tab === 'canvas' && <MobileCanvas />}
        {tab === 'create' && <MobileCreatePage />}
        {tab === 'characters' && <MobileCharacterManager />}
      </div>
      <MobileBottomNav current={tab} onChange={setTab} />
    </div>
  )
}`,

  'src/features/mobile/MobileBottomNav.tsx': `export type TabKey = 'list' | 'canvas' | 'create' | 'characters'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'list', label: '分镜', icon: '🎬' },
  { key: 'canvas', label: '画布', icon: '🎨' },
  { key: 'create', label: '创作', icon: '✨' },
  { key: 'characters', label: '角色', icon: '👤' },
]

export default function MobileBottomNav({ current, onChange }: { current: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="flex border-t bg-white safe-bottom">
      {TABS.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={\`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors \${current === t.key ? 'text-purple-600' : 'text-gray-400'}\`}>
          <span className="text-xl">{t.icon}</span>
          <span className="text-[10px] font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  )
}`,

  'src/features/mobile/MobileStoryboardList.tsx': `import { useCanvasStore } from '@/stores/canvasStore'
import { localImageUrl } from '@/services/imageStorage'
import { generateImage } from '@/services/aiService'
import { downloadAndSaveImage } from '@/services/imageStorage'
import { hapticMedium } from '@/services/haptics'
import { notifyGenerationComplete } from '@/services/notification'
import { exportAsZip } from '@/services/exportService'

export default function MobileStoryboardList() {
  const { nodes, updateNodeData } = useCanvasStore()
  const list = nodes.filter(n => n.type === 'storyboard')
    .sort((a, b) => (a.data as any).shotNumber - (b.data as any).shotNumber)

  const gen = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const { sceneDescription, cameraAngle } = node.data as any
    updateNodeData(nodeId, { imageStatus: 'generating' })
    try {
      const prompt = \`电影分镜画面，\${cameraAngle}，\${sceneDescription}，专业摄影，电影感光线\`
      const url = await generateImage(prompt)
      const p = await downloadAndSaveImage(url, nodeId)
      updateNodeData(nodeId, { imagePath: p, imageStatus: 'done' })
      hapticMedium()
      notifyGenerationComplete(1)
    } catch (e: any) {
      updateNodeData(nodeId, { imageStatus: 'error', imageError: e.message })
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">分镜列表</h1>
        <button onClick={() => exportAsZip(nodes)}
          className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">导出ZIP</button>
      </div>
      {list.length === 0 && (
        <div className="text-center text-gray-400 py-20 text-sm">还没有分镜，去"创作"页生成吧</div>
      )}
      {list.map(node => {
        const d = node.data as any
        return (
          <div key={node.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="aspect-video bg-gray-50 flex items-center justify-center">
              {d.imageStatus === 'done' && d.imagePath ? (
                <img src={localImageUrl(d.imagePath)} alt="" className="w-full h-full object-cover" />
              ) : d.imageStatus === 'generating' ? (
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 mt-2">生成中...</span>
                </div>
              ) : (
                <button onClick={() => gen(node.id)}
                  className="text-sm text-purple-600 font-medium active:scale-95 transition-transform">
                  点击生成画面
                </button>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-purple-700">镜头 {d.shotNumber}</span>
                <span className="text-[10px] text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                  {d.cameraAngle} · {d.duration}s</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{d.sceneDescription}</p>
              {d.dialogue && <p className="text-xs text-gray-400 mt-2 italic">💬 {d.dialogue}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}`,

  'src/features/mobile/MobileCanvas.tsx': `import Canvas from '@/features/canvas/Canvas'
export default function MobileCanvas() {
  return <Canvas touchOptimized />
}`,

  'src/features/mobile/MobileCreatePage.tsx': `import { useState } from 'react'
import { expandToScript, generateStoryboard } from '@/services/aiService'
import { useCanvasStore } from '@/stores/canvasStore'
import { hapticMedium } from '@/services/haptics'
import { notifyGenerationComplete } from '@/services/notification'

export default function MobileCreatePage() {
  const [idea, setIdea] = useState('')
  const [script, setScript] = useState('')
  const [loading, setLoading] = useState<'idle'|'expand'|'storyboard'>('idle')
  const { setNodes, setEdges } = useCanvasStore()

  const handleExpand = async () => {
    if (!idea.trim()) return
    setLoading('expand')
    try {
      const result = await expandToScript(idea)
      setScript(result)
      hapticMedium()
    } catch (e: any) { alert(e.message) }
    finally { setLoading('idle') }
  }

  const handleStoryboard = async () => {
    if (!script.trim()) return
    setLoading('storyboard')
    try {
      const sb = await generateStoryboard(script)
      const newNodes = sb.map((s: any, i: number) => ({
        id: \`shot-\${Date.now()}-\${i}\`, type: 'storyboard',
        position: { x: 100, y: 100 + i * 200 },
        data: { shotNumber: s.shotNumber, sceneDescription: s.sceneDescription,
          cameraAngle: s.cameraAngle, duration: s.duration, dialogue: s.dialogue || '' },
      }))
      setNodes(newNodes)
      setEdges([])
      hapticMedium()
      notifyGenerationComplete(newNodes.length)
      alert(\`已生成 \${newNodes.length} 个分镜\`)
    } catch (e: any) { alert(e.message) }
    finally { setLoading('idle') }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">AI 创作</h1>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <label className="text-sm font-medium text-gray-700 mb-2 block">一句话创意</label>
        <textarea value={idea} onChange={e => setIdea(e.target.value)}
          placeholder="例如：一个外卖员意外获得时间暂停能力..."
          rows={3}
          className="w-full p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400" />
        <button onClick={handleExpand} disabled={loading !== 'idle' || !idea.trim()}
          className="mt-2 w-full bg-purple-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 active:scale-98 transition-transform">
          {loading === 'expand' ? '扩写中...' : 'AI 扩写为完整剧本'}
        </button>
      </div>

      {script && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm font-medium text-gray-700 mb-2 block">剧本内容</label>
          <textarea value={script} onChange={e => setScript(e.target.value)} rows={10}
            className="w-full p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400" />
          <button onClick={handleStoryboard} disabled={loading !== 'idle'}
            className="mt-2 w-full bg-green-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 active:scale-98 transition-transform">
            {loading === 'storyboard' ? '拆解中...' : 'AI 拆解分镜'}
          </button>
        </div>
      )}
    </div>
  )
}`,

  'src/features/mobile/MobileCharacterManager.tsx': `import { useState, useEffect } from 'react'
import { captureReferenceImage } from '@/services/camera'
import { generateCharacterPortrait, loadCharacters, saveCharacter, deleteCharacter, type Character } from '@/services/characterService'
import { localImageUrl } from '@/services/imageStorage'
import { hapticMedium } from '@/services/haptics'

export default function MobileCharacterManager() {
  const [chars, setChars] = useState<Character[]>([])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [style, setStyle] = useState('写实电影')
  const [refImage, setRefImage] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadCharacters().then(setChars) }, [])

  const handleCapture = async () => {
    try {
      const img = await captureReferenceImage()
      if (img) setRefImage(img)
    } catch (e: any) { alert(e.message) }
  }

  const handleGenerate = async () => {
    if (!name.trim() || !desc.trim()) return
    setGenerating(true)
    try {
      const portrait = await generateCharacterPortrait(name, desc, style, refImage || undefined)
      const c: Character = { id: Date.now().toString(), name, description: desc, style, referenceImagePath: portrait }
      await saveCharacter(c)
      setChars([...chars, c])
      setName(''); setDesc(''); setRefImage(null)
      hapticMedium()
    } catch (e: any) { alert(e.message) }
    finally { setGenerating(false) }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">角色库</h1>
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="角色名"
          className="w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="角色描述（外貌、性格、服装）" rows={3}
          className="w-full p-2.5 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400" />
        <select value={style} onChange={e => setStyle(e.target.value)}
          className="w-full p-2.5 text-sm border rounded-lg">
          <option>写实电影</option><option>日系动漫</option><option>国风水墨</option><option>3D渲染</option>
        </select>
        <button onClick={handleCapture}
          className="w-full border-2 border-dashed border-gray-300 py-2.5 rounded-lg text-sm text-gray-500 active:scale-98 transition-transform">
          {refImage ? '✓ 已拍摄参考图' : '📷 拍摄参考图（可选）'}
        </button>
        <button onClick={handleGenerate} disabled={generating || !name.trim()}
          className="w-full bg-purple-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 active:scale-98 transition-transform">
          {generating ? '生成中...' : '生成角色定妆照'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {chars.map(c => (
          <div key={c.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
            <img src={localImageUrl(c.referenceImagePath)} alt={c.name} className="w-full aspect-square object-cover" />
            <div className="p-2">
              <div className="text-sm font-medium text-gray-700">{c.name}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{c.style}</div>
              <button onClick={() => { deleteCharacter(c.id); setChars(chars.filter(x => x.id !== c.id)) }}
                className="text-[10px] text-red-500 mt-1">删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}`,

  'src/features/mobile/BiometricLockScreen.tsx': `import { unlockWithBiometric } from '@/services/biometric'

export default function BiometricLockScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-500 to-purple-700 text-white px-8">
      <div className="text-6xl mb-6">🔒</div>
      <h1 className="text-2xl font-bold mb-2">分镜助手</h1>
      <p className="text-purple-200 text-sm mb-10">验证身份以访问项目</p>
      <button onClick={async () => { const ok = await unlockWithBiometric(); if (ok) onUnlock() }}
        className="bg-white text-purple-600 px-8 py-3 rounded-full font-medium shadow-lg active:scale-95 transition-transform">
        解锁
      </button>
    </div>
  )
}`,

  // ==================== 设置页 / 会员 ====================
  'src/features/settings/SettingsPage.tsx': `import { useState, useEffect } from 'react'
import { saveApiKey, getApiKey, getProvider } from '@/services/secureStorage'

const PROVIDERS = [
  { id: 'dashscope', name: '阿里云百炼', placeholder: 'sk-...', help: 'https://bailian.console.aliyun.com/' },
  { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...', help: 'https://platform.deepseek.com/' },
  { id: '302ai', name: '302.AI', placeholder: 'sk-...', help: 'https://302.ai/' },
]

export default function SettingsPage({ onSaved }: { onSaved: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('dashscope')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getApiKey(), getProvider()]).then(([k, p]) => {
      if (k) setApiKey(k); if (p) setProvider(p); setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    if (!apiKey.trim()) return
    await saveApiKey(apiKey.trim(), provider)
    setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 1200)
  }

  const cur = PROVIDERS.find(p => p.id === provider)
  if (loading) return <div className="p-8">加载中...</div>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">模型设置</h1>
        <p className="text-gray-500 text-sm mb-6">选择AI模型供应商，填入你的API Key</p>
        <label className="block mb-2 text-sm font-medium text-gray-700">供应商</label>
        <select value={provider} onChange={e => setProvider(e.target.value)}
          className="w-full p-2 border rounded mb-4 focus:ring-2 focus:ring-blue-500">
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="block mb-2 text-sm font-medium text-gray-700">API Key</label>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          placeholder={cur?.placeholder}
          className="w-full p-2 border rounded mb-2 focus:ring-2 focus:ring-blue-500" />
        <p className="text-xs text-gray-400 mb-4">
          前往 <a href={cur?.help} target="_blank" className="text-blue-500 underline">{cur?.name}</a> 获取API Key
        </p>
        <button onClick={handleSave} disabled={!apiKey.trim()}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50">
          {saved ? '✓ 已保存' : '保存'}
        </button>
      </div>
    </div>
  )
}`,

  'src/features/membership/RedeemPage.tsx': `import { useState } from 'react'
import { redeemCode } from '@/services/redeemService'

export default function RedeemPage({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRedeem = async () => {
    if (!code.trim()) return
    setLoading(true)
    try {
      const res = await redeemCode(code)
      setResult(res)
      if (res.success) setTimeout(onSuccess, 1500)
    } catch (e: any) { setResult({ success: false, message: e.message }) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">会员兑换</h1>
        <p className="text-gray-500 text-sm mb-6">输入兑换码解锁全部功能</p>
        <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19}
          className="w-full p-3 border rounded text-center text-lg tracking-widest font-mono mb-4 focus:ring-2 focus:ring-blue-500" />
        <button onClick={handleRedeem} disabled={loading || code.length < 19}
          className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 disabled:opacity-50">
          {loading ? '兑换中...' : '兑换'}
        </button>
        {result && (
          <div className={\`mt-4 p-3 rounded text-sm \${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}\`}>
            {result.message}</div>
        )}
        <p className="text-xs text-gray-400 mt-6 text-center">兑换码请联系管理员获取</p>
      </div>
    </div>
  )
}`,

  // ==================== 服务层 ====================
  'src/services/secureStorage.ts': `import { Stronghold } from '@tauri-apps/plugin-stronghold'
import { appDataDir } from '@tauri-apps/api/path'

let stronghold: Stronghold | null = null
let client: any = null

async function init() {
  if (client) return
  const vaultPath = \`\${await appDataDir()}/vault.hold\`
  stronghold = await Stronghold.load(vaultPath, 'fenjing-fuike')
  try { client = await stronghold.loadClient('app') }
  catch { client = await stronghold.createClient('app') }
}

export async function saveApiKey(key: string, provider: string) {
  await init()
  const s = client.getStore()
  await s.insert('api_key', Array.from(new TextEncoder().encode(key)))
  await s.insert('provider', Array.from(new TextEncoder().encode(provider)))
  await stronghold!.save()
}

export async function getApiKey(): Promise<string | null> {
  try {
    await init()
    const d = await client.getStore().get('api_key')
    return d ? new TextDecoder().decode(new Uint8Array(d)) : null
  } catch { return null }
}

export async function getProvider(): Promise<string> {
  try {
    await init()
    const d = await client.getStore().get('provider')
    return d ? new TextDecoder().decode(new Uint8Array(d)) : 'dashscope'
  } catch { return 'dashscope' }
}`,

  'src/services/aiService.ts': `import { fetch } from '@tauri-apps/plugin-http'
import { getApiKey, getProvider } from './secureStorage'

const CONFIG: Record<string, { baseUrl: string; model: string }> = {
  dashscope: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'deepseek-v4-pro' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  '302ai': { baseUrl: 'https://api.302ai.com/v1', model: 'deepseek-v4-pro' },
}

async function chat(systemPrompt: string, userContent: string) {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('请先在设置中填入API Key')
  const provider = await getProvider()
  const cfg = CONFIG[provider]
  if (!cfg) throw new Error(\`不支持的供应商: \${provider}\`)
  const res = await fetch(\`\${cfg.baseUrl}/chat/completions\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${apiKey}\` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
      temperature: 0.7,
    }),
  })
  if (!res.ok) throw new Error(\`API调用失败 (\${res.status}): \${await res.text()}\`)
  const data = await res.json()
  return data.choices[0].message.content as string
}

export async function generateStoryboard(script: string) {
  const content = await chat(
    '你是分镜师。将用户剧本拆解为分镜，返回JSON数组。每个镜头包含：shotNumber, sceneDescription, cameraAngle, duration, dialogue。只返回JSON数组，不要任何其他文字。',
    script
  )
  const m = content.match(/\\[[\\s\\S]*\\]/)
  if (!m) throw new Error('API返回格式错误')
  return JSON.parse(m[0])
}

export async function expandToScript(idea: string): Promise<string> {
  return chat(
    '你是短剧编剧。用户会给你一句话创意，扩写为完整短剧剧本。包含起承转合，场景描述具体，台词自然口语化。',
    idea
  )
}

export async function generateImage(prompt: string): Promise<string> {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('请先在设置中填入API Key')
  const provider = await getProvider()
  let url: string, body: any
  if (provider === '302ai') {
    url = 'https://api.302.ai/doubao/images/generations'
    body = { model: 'doubao-seedream-3-0-t2i-250415', prompt, response_format: 'url', size: '1024x1024', watermark: false }
  } else if (provider === 'dashscope') {
    url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis'
    body = { model: 'doubao-seedream-3-0-t2i-250415', input: { prompt }, parameters: { size: '1024*1024', n: 1 } }
  } else { throw new Error(\`供应商 \${provider} 暂不支持图片生成\`) }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${apiKey}\` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(\`图片生成失败 (\${res.status}): \${await res.text()}\`)
  const data = await res.json()
  const imageUrl = data.data?.[0]?.url || data.output?.results?.[0]?.url
  if (!imageUrl) throw new Error('API未返回图片URL')
  return imageUrl
}`,

  'src/services/imageStorage.ts': `import { fetch } from '@tauri-apps/plugin-http'
import { writeFile, mkdir, BaseDirectory, exists } from '@tauri-apps/plugin-fs'

const DIR = 'storyboard-images'

export async function downloadAndSaveImage(remoteUrl: string, imageId: string): Promise<string> {
  const dirExists = await exists(DIR, { baseDir: BaseDirectory.AppData })
  if (!dirExists) await mkdir(DIR, { baseDir: BaseDirectory.AppData, recursive: true })
  const res = await fetch(remoteUrl)
  const bytes = new Uint8Array(await res.arrayBuffer())
  const filePath = \`\${DIR}/\${imageId}.png\`
  await writeFile(filePath, bytes, { baseDir: BaseDirectory.AppData })
  return filePath
}

export function localImageUrl(filePath: string): string {
  return \`asset://localhost/\${encodeURIComponent(filePath)}\`
}`,

  'src/services/exportService.ts': `import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { Node } from '@xyflow/react'
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs'

function extract(nodes: Node[]) {
  return nodes.filter(n => n.type === 'storyboard').map(n => ({
    shotNumber: (n.data as any).shotNumber,
    sceneDescription: (n.data as any).sceneDescription,
    cameraAngle: (n.data as any).cameraAngle,
    duration: (n.data as any).duration,
    dialogue: (n.data as any).dialogue,
    imagePath: (n.data as any).imagePath,
  })).sort((a, b) => a.shotNumber - b.shotNumber)
}

export async function exportAsZip(nodes: Node[], name = 'storyboard') {
  const zip = new JSZip()
  const data = extract(nodes)
  const headers = ['镜头号', '画面描述', '景别', '时长', '台词']
  const rows = data.map(d => [d.shotNumber, d.sceneDescription, d.cameraAngle, d.duration, d.dialogue || '']
    .map(v => \`"\${String(v).replace(/"/g, '""')}"\`).join(','))
  zip.file(\`\${name}.csv\`, '\\uFEFF' + [headers.join(','), ...rows].join('\\n'))
  const imgFolder = zip.folder('images')!
  for (const d of data) {
    if (d.imagePath) {
      try {
        const bytes = await readFile(d.imagePath, { baseDir: BaseDirectory.AppData })
        imgFolder.file(\`\${String(d.shotNumber).padStart(2, '0')}.png\`, bytes)
      } catch (e) { console.warn(e) }
    }
  }
  zip.file(\`\${name}_meta.json\`, JSON.stringify(data, null, 2))
  saveAs(await zip.generateAsync({ type: 'blob' }), \`\${name}.zip\`)
}

export function exportAsMarkdown(nodes: Node[], name = 'storyboard') {
  const data = extract(nodes)
  let md = \`# \${name} 分镜脚本\\n\\n\`
  for (const d of data) {
    md += \`## 镜头 \${d.shotNumber}\\n- **景别**：\${d.cameraAngle}\\n- **时长**：\${d.duration}秒\\n- **画面**：\${d.sceneDescription}\\n\`
    if (d.dialogue) md += \`- **台词**：\${d.dialogue}\\n\`
    md += '\\n'
  }
  saveAs(new Blob([md], { type: 'text/markdown;charset=utf-8' }), \`\${name}.md\`)
}

export function exportAsJson(nodes: Node[], name = 'storyboard') {
  const data = extract(nodes)
  saveAs(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), \`\${name}.json\`)
}`,

  'src/services/redeemService.ts': `import Database from '@tauri-apps/plugin-sql'

let db: Database | null = null
const getDb = async () => { if (!db) db = await Database.load('sqlite:app.db'); return db }

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const s = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join('')
  return \`\${s()}-\${s()}-\${s()}-\${s()}\`
}

export async function batchGenerateCodes(count: number, plan = 'pro', maxUses = 1) {
  const d = await getDb()
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = genCode()
    await d.execute('INSERT OR IGNORE INTO redeem_codes (code, plan, max_uses, created_at) VALUES (?, ?, ?, ?)',
      [code, plan, maxUses, Date.now()])
    codes.push(code)
  }
  return codes
}

export async function redeemCode(code: string) {
  const d = await getDb()
  const c = code.trim().toUpperCase()
  const rows = await d.select<any[]>('SELECT * FROM redeem_codes WHERE code = ?', [c])
  if (!rows.length) return { success: false, message: '兑换码不存在' }
  const r = rows[0]
  if (!r.is_active) return { success: false, message: '兑换码已禁用' }
  if (r.used_count >= r.max_uses) return { success: false, message: '兑换码已用完' }
  if (r.expires_at && Date.now() > r.expires_at) return { success: false, message: '兑换码已过期' }
  await d.execute('UPDATE redeem_codes SET used_count = used_count + 1 WHERE code = ?', [c])
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000
  await d.execute('INSERT OR REPLACE INTO user_membership (id, plan, activated_at, expires_at, redeem_code) VALUES (1, ?, ?, ?, ?)',
    [r.plan, Date.now(), exp, c])
  return { success: true, plan: r.plan, message: \`兑换成功，\${r.plan} 会员已激活\` }
}

export async function getMembership() {
  try {
    const d = await getDb()
    const rows = await d.select<any[]>('SELECT plan, expires_at FROM user_membership WHERE id = 1')
    if (!rows.length) return { plan: 'free', expiresAt: null, isActive: true }
    const r = rows[0]
    const active = !r.expires_at || Date.now() < r.expires_at
    return { plan: active ? r.plan : 'free', expiresAt: r.expires_at, isActive: active }
  } catch { return { plan: 'free', expiresAt: null, isActive: true } }
}`,

  'src/services/biometric.ts': `import { authenticate, checkStatus } from '@tauri-apps/plugin-biometric'

export async function unlockWithBiometric(): Promise<boolean> {
  try {
    const status = await checkStatus()
    if (!status.isAvailable) return false
    const r = await authenticate('解锁分镜助手', {
      allowDeviceCredential: true,
      cancelTitle: '取消', fallbackTitle: '使用密码',
      title: '分镜助手', subtitle: '验证身份以访问项目',
    })
    return r.success
  } catch { return false }
}

export async function isBiometricAvailable(): Promise<boolean> {
  try { return (await checkStatus()).isAvailable } catch { return false }
}`,

  'src/services/camera.ts': `import { takePicture, requestPermissions } from '@tauri-apps/plugin-camera'

export async function captureReferenceImage(): Promise<string | null> {
  const p = await requestPermissions()
  if (p.camera !== 'granted') throw new Error('需要相机权限')
  const photo = await takePicture({
    quality: 90, targetWidth: 1024, targetHeight: 1024, cameraDirection: 'back',
  })
  return photo
}`,

  'src/services/haptics.ts': `import { impactFeedback } from '@tauri-apps/plugin-haptics'

export const hapticLight = async () => { try { await impactFeedback('light') } catch {} }
export const hapticMedium = async () => { try { await impactFeedback('medium') } catch {} }
export const hapticHeavy = async () => { try { await impactFeedback('heavy') } catch {} }`,

  'src/services/notification.ts': `import { sendNotification, requestPermission, isPermissionGranted } from '@tauri-apps/plugin-notification'

export async function notifyGenerationComplete(count: number) {
  try {
    let granted = await isPermissionGranted()
    if (!granted) { const p = await requestPermission(); granted = p === 'granted' }
    if (granted) sendNotification({ title: '分镜生成完成', body: \`已生成 \${count} 个分镜画面\` })
  } catch {}
}`,

  'src/services/characterService.ts': `import Database from '@tauri-apps/plugin-sql'
import { generateImage } from './aiService'
import { downloadAndSaveImage } from './imageStorage'

export interface Character {
  id: string; name: string; description: string
  style: string; referenceImagePath: string
}

let db: Database | null = null
const getDb = async () => {
  if (!db) {
    db = await Database.load('sqlite:app.db')
    await db.execute(\`CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      style TEXT, reference_image_path TEXT, created_at INTEGER)\`)
  }
  return db
}

export async function loadCharacters(): Promise<Character[]> {
  const d = await getDb()
  const rows = await d.select<any[]>('SELECT * FROM characters ORDER BY created_at DESC')
  return rows.map(r => ({
    id: r.id, name: r.name, description: r.description,
    style: r.style, referenceImagePath: r.reference_image_path,
  }))
}

export async function saveCharacter(c: Character) {
  const d = await getDb()
  await d.execute('INSERT OR REPLACE INTO characters (id, name, description, style, reference_image_path, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [c.id, c.name, c.description, c.style, c.referenceImagePath, Date.now()])
}

export async function deleteCharacter(id: string) {
  const d = await getDb()
  await d.execute('DELETE FROM characters WHERE id = ?', [id])
}

export async function generateCharacterPortrait(
  name: string, description: string, style: string, referenceImage?: string
): Promise<string> {
  const prompt = referenceImage
    ? \`基于参考图生成角色定妆照：\${name}，\${description}，\${style}风格，正面全身，纯色背景\`
    : \`生成角色定妆照：\${name}，\${description}，\${style}风格，正面全身，纯色背景\`
  const url = await generateImage(prompt)
  return await downloadAndSaveImage(url, \`char-\${Date.now()}\`)
}`,

  'src/services/videoService.ts': `// 视频合成预留接口，后续接入 FFmpeg 或云端视频API
export async function composeVideoFromStoryboard(
  _shots: { imagePath: string; duration: number }[]
): Promise<string> {
  throw new Error('视频合成功能开发中')
}`,

  'src/services/deepLink.ts': `import { onOpenUrl } from '@tauri-apps/plugin-deep-link'

export async function initDeepLink() {
  try {
    await onOpenUrl((urls) => {
      const projectId = urls[0]?.split('/').pop()
      if (projectId) console.log('Deep link project:', projectId)
    })
  } catch {}
}`,

  // ==================== i18n ====================
  'src/i18n/index.ts': `import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import en from './locales/en.json'

i18n.use(initReactI18next).init({
  resources: { zh: { translation: zh }, en: { translation: en } },
  lng: navigator.language.startsWith('zh') ? 'zh' : 'en',
  fallbackLng: 'zh', interpolation: { escapeValue: false },
})
export default i18n`,

  'src/i18n/locales/zh.json': JSON.stringify({
    app: { name: '分镜助手' },
    settings: { title: '模型设置', provider: '供应商', apiKey: 'API Key', save: '保存', saved: '已保存' },
    canvas: { scriptInput: '剧本输入', generate: '生成分镜', generating: '生成中...', generateImage: '点击生成画面', export: '导出', nodePanel: '节点面板' },
    membership: { title: '会员兑换', placeholder: 'XXXX-XXXX-XXXX-XXXX', redeem: '兑换', redeeming: '兑换中...' }
  }, null, 2),

  'src/i18n/locales/en.json': JSON.stringify({
    app: { name: 'Storyboard Copilot' },
    settings: { title: 'Model Settings', provider: 'Provider', apiKey: 'API Key', save: 'Save', saved: 'Saved' },
    canvas: { scriptInput: 'Script Input', generate: 'Generate', generating: 'Generating...', generateImage: 'Click to Generate', export: 'Export', nodePanel: 'Node Panel' },
    membership: { title: 'Redeem', placeholder: 'XXXX-XXXX-XXXX-XXXX', redeem: 'Redeem', redeeming: 'Redeeming...' }
  }, null, 2),

  // ==================== Tauri 后端 ====================
  'src-tauri/Cargo.toml': `[package]
name = "fenjing-fuike"
version = "0.1.0"
description = "AI Storyboard Workbench"
edition = "2021"

[lib]
name = "fenjing_fuike_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-http = "2"
tauri-plugin-fs = "2"
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-stronghold = "2"
tauri-plugin-biometric = "2"
tauri-plugin-camera = "2"
tauri-plugin-haptics = "2"
tauri-plugin-notification = "2"
tauri-plugin-clipboard-manager = "2"
tauri-plugin-dialog = "2"
tauri-plugin-os = "2"
tauri-plugin-opener = "2"
tauri-plugin-deep-link = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
argon2 = "0.5.3"
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite"] }
tokio = { version = "1", features = ["full"] }`,

  'src-tauri/build.rs': `fn main() { tauri_build::build() }`,

  'src-tauri/src/main.rs': `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() { fenjing_fuike_lib::run() }`,

  'src-tauri/src/lib.rs': `#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_stronghold::Builder::new(|password| {
            use argon2::{hash_raw, Config, Variant, Version};
            let config = Config { lanes: 4, mem_cost: 10_000, time_cost: 10,
                variant: Variant::Argon2id, version: Version::Version13, ..Default::default() };
            hash_raw(password.as_ref(), b"fenjing-salt", &config).expect("hash failed")
        }).build())
        .plugin(tauri_plugin_biometric::init())
        .plugin(tauri_plugin_camera::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                if let Ok(pool) = tauri_plugin_sql::DbPool::connect("sqlite:app.db").await {
                    for sql in [
                        "CREATE TABLE IF NOT EXISTS node_data (node_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)",
                        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
                        "CREATE TABLE IF NOT EXISTS redeem_codes (code TEXT PRIMARY KEY, plan TEXT NOT NULL DEFAULT 'pro', max_uses INTEGER NOT NULL DEFAULT 1, used_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER, is_active INTEGER NOT NULL DEFAULT 1)",
                        "CREATE TABLE IF NOT EXISTS user_membership (id INTEGER PRIMARY KEY CHECK (id = 1), plan TEXT NOT NULL DEFAULT 'free', activated_at INTEGER, expires_at INTEGER, redeem_code TEXT)",
                        "CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, style TEXT, reference_image_path TEXT, created_at INTEGER)"
                    ] {
                        let _ = sqlx::query(sql).execute(&pool).await;
                    }
                }
                let _ = handle;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}`,

  'src-tauri/capabilities/default.json': JSON.stringify({
    "$schema": "../gen/schemas/desktop-schema.json",
    identifier: "default", description: "桌面端能力",
    windows: ["main"], platforms: ["linux", "macOS", "windows"],
    permissions: [
      "core:default", "http:default", "stronghold:default", "fs:default",
      { identifier: "http:allow-fetch", allow: [
        { url: "https://dashscope.aliyuncs.com/*" },
        { url: "https://api.deepseek.com/*" },
        { url: "https://api.302.ai/*" },
        { url: "https://ark.cn-beijing.volces.com/*" }
      ]},
      { identifier: "fs:allow-write-file", allow: [{ path: "$APPDATA/storyboard-images/**" }]},
      { identifier: "fs:allow-mkdir", allow: [{ path: "$APPDATA/storyboard-images/**" }]},
      { identifier: "fs:allow-read-file", allow: [{ path: "$APPDATA/storyboard-images/**" }]}
    ]
  }, null, 2),

  'src-tauri/capabilities/mobile.json': JSON.stringify({
    "$schema": "../gen/schemas/mobile-schema.json",
    identifier: "mobile", description: "移动端能力",
    windows: ["main"], platforms: ["android", "iOS"],
    permissions: [
      "core:default", "http:default", "stronghold:default", "fs:default",
      "biometric:default", "camera:default", "haptics:default",
      "notification:default", "clipboard-manager:default",
      "dialog:default", "os:default", "opener:default", "deep-link:default",
      { identifier: "http:allow-fetch", allow: [
        { url: "https://dashscope.aliyuncs.com/*" },
        { url: "https://api.deepseek.com/*" },
        { url: "https://api.302.ai/*" },
        { url: "https://ark.cn-beijing.volces.com/*" }
      ]},
      { identifier: "fs:allow-write-file", allow: [{ path: "$APPDATA/storyboard-images/**" }]},
      { identifier: "fs:allow-mkdir", allow: [{ path: "$APPDATA/storyboard-images/**" }]},
      { identifier: "fs:allow-read-file", allow: [{ path: "$APPDATA/storyboard-images/**" }]}
    ]
  }, null, 2),

  'src-tauri/tauri.conf.json': JSON.stringify({
    "$schema": "https://schema.tauri.app/config/2",
    productName: "分镜助手",
    version: "0.1.0",
    identifier: "com.fenjingfuike.app",
    build: {
      frontendDist: "../dist",
      devUrl: "http://localhost:1420",
      beforeDevCommand: "npm run dev",
      beforeBuildCommand: "npm run build"
    },
    app: {
      windows: [{ title: "分镜助手", width: 1400, height: 900, resizable: true }],
      security: {
        csp: "default-src 'self'; img-src 'self' asset: http://asset.localhost https: data:; connect-src 'self' https: http: ipc: http://ipc.localhost",
        assetProtocol: { enable: true, scope: ["$APPDATA/storyboard-images/**"] }
      }
    },
    bundle: {
      active: true,
      targets: ["msi", "dmg", "appimage"],
      icon: ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"],
      iOS: {
        minimumSystemVersion: "15.0",
        infoPlist: {
          NSCameraUsageDescription: "用于拍摄角色参考图",
          NSPhotoLibraryUsageDescription: "用于选择角色照片和保存分镜图片",
          NSFaceIDUsageDescription: "用于解锁应用"
        }
      },
      android: {
        minSdkVersion: 24,
        permissions: [
          "android.permission.CAMERA",
          "android.permission.READ_EXTERNAL_STORAGE",
          "android.permission.WRITE_EXTERNAL_STORAGE",
          "android.permission.USE_BIOMETRIC",
          "android.permission.VIBRATE"
        ]
      }
    },
    plugins: {
      "deep-link": { mobile: [{ scheme: ["fenjing"] }] }
    }
  }, null, 2),
};

function writeFile(filePath, content) {
  const full = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  console.log('  ✓', filePath);
}

console.log('\n🚀 正在生成分镜助手项目（桌面端 + 移动端）...\n');
Object.entries(files).forEach(([p, c]) => writeFile(p, c));
console.log('\n✅ 全部文件生成完毕！\n');
console.log('📋 下一步执行顺序：');
console.log('');
console.log('  # 1. 安装依赖');
console.log('  npm install');
console.log('');
console.log('  # 2. 生成图标（需要一张 1024x1024 的 PNG）');
console.log('  npx tauri icon 你的图标.png');
console.log('');
console.log('  # 3. 桌面端开发调试');
console.log('  npm run tauri dev');
console.log('');
console.log('  # 4. 桌面端打包');
console.log('  npm run tauri build');
console.log('');
console.log('  # 5. 移动端（Android）');
console.log('  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android');
console.log('  npm run android:init');
console.log('  npm run android:dev      # 连接设备调试');
console.log('  npm run android:build    # 构建 APK');
console.log('');
console.log('  # 6. 移动端（iOS，仅 macOS）');
console.log('  rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim');
console.log('  npm run ios:init');
console.log('  npm run ios:dev');
console.log('');
