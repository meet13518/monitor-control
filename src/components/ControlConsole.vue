<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

type ConsoleLog = {
  id: number
  time: string
  text: string
  status: 'pending' | 'success'
}

const props = defineProps<{
  open: boolean
  logs: ConsoleLog[]
  running: boolean
  progress: number
}>()

const emit = defineEmits<{
  close: []
}>()

const bodyRef = ref<HTMLDivElement>()
const panelPosition = reactive({ left: 0, top: 0 })
const dragState = reactive({
  dragging: false,
  offsetX: 0,
  offsetY: 0,
})

const panelStyle = computed(() => ({
  left: `${panelPosition.left}px`,
  top: `${panelPosition.top}px`,
}))

const centerPanel = () => {
  const panelWidth = 560
  const panelHeight = 364
  panelPosition.left = Math.max(20, Math.round((window.innerWidth - panelWidth) / 2))
  panelPosition.top = Math.max(20, Math.round((window.innerHeight - panelHeight) / 2))
}

const onMouseMove = (event: MouseEvent) => {
  if (!dragState.dragging) return
  panelPosition.left = Math.max(20, event.clientX - dragState.offsetX)
  panelPosition.top = Math.max(20, event.clientY - dragState.offsetY)
}

const stopDrag = () => {
  dragState.dragging = false
}

const startDrag = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.parentElement?.getBoundingClientRect()
  if (!rect) return
  dragState.dragging = true
  dragState.offsetX = event.clientX - rect.left
  dragState.offsetY = event.clientY - rect.top
}

watch(
  () => props.logs.length,
  async () => {
    await nextTick()
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight
    }
  },
)

watch(
  () => props.open,
  (opened) => {
    if (opened) {
      centerPanel()
    }
  },
)

window.addEventListener('mousemove', onMouseMove)
window.addEventListener('mouseup', stopDrag)
window.addEventListener('resize', centerPanel)

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('resize', centerPanel)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="console-mask" @click.self="emit('close')">
      <div class="console-panel" :style="panelStyle">
        <div class="console-header" @mousedown="startDrag">
          <span>去控控制台</span>
          <a-button type="text" size="small" @click="emit('close')">关闭</a-button>
        </div>
        <div class="progress-wrap">
          <a-progress
            :percent="props.progress"
            size="small"
            :status="props.running ? 'active' : 'success'"
            :show-info="true"
          />
        </div>
        <div ref="bodyRef" class="console-body">
          <div v-for="item in logs" :key="item.id" class="line">
            <span class="line-time">{{ item.time }}</span>
            <span :class="['dot', item.status]">{{ item.status === 'success' ? '●' : '○' }}</span>
            <span class="line-text">{{ item.text }}</span>
          </div>
          <div v-if="running" class="line running">处理中...</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.console-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}

.console-panel {
  position: absolute;
  width: 560px;
  max-width: calc(100vw - 40px);
  border-radius: 10px;
  overflow: hidden;
  background: #10161d;
  border: 1px solid rgba(110, 171, 255, 0.25);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.35);
}

.console-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  color: #e6f4ff;
  background: #1b2834;
  cursor: move;
  user-select: none;
}

.console-body {
  height: 280px;
  overflow: auto;
  padding: 12px;
  font-family: Consolas, 'Courier New', monospace;
  color: #dcf4ff;
}

.progress-wrap {
  padding: 10px 12px 0;
}

.line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
}

.line-time {
  color: #8cb6d8;
}

.line-text {
  flex: 1;
}

.dot.pending {
  color: #f4cf66;
}

.dot.success {
  color: #66e2a3;
}

.running {
  color: #58b9ff;
}
</style>
