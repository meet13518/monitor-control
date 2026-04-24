<script setup lang="ts">
import dayjs from 'dayjs'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  deviceId: string
}>()

const shellRef = ref<HTMLDivElement>()
const videoRef = ref<HTMLVideoElement>()
const nowText = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
let timerId = 0
const videoSource = '/videos/cctv.mp4'
const fallbackSource = 'https://cdn.pixabay.com/video/2023/06/04/165899-833028348_large.mp4'

const enterFullscreen = async () => {
  if (!shellRef.value) return
  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }
  await shellRef.value.requestFullscreen()
}

const onVideoError = () => {
  if (videoRef.value) {
    videoRef.value.src = fallbackSource
    videoRef.value.play().catch(() => undefined)
  }
}

onMounted(() => {
  timerId = window.setInterval(() => {
    nowText.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }, 1000)
  videoRef.value?.play().catch(() => undefined)
})

onBeforeUnmount(() => {
  window.clearInterval(timerId)
})
</script>

<template>
  <div ref="shellRef" class="monitor-screen">
    <video
      ref="videoRef"
      class="monitor-video"
      :src="videoSource"
      autoplay
      muted
      loop
      playsinline
      @error="onVideoError"
    />
    <div class="osd top">
      <span>CAM-07</span>
      <span>{{ nowText }}</span>
    </div>
    <div class="osd bottom">
      <span>DEVICE {{ deviceId }}</span>
      <span>LIVE MONITOR FEED</span>
    </div>
    <a-button class="full-btn" size="small" @click="enterFullscreen">全屏</a-button>
  </div>
</template>

<style scoped>
.monitor-screen {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(77, 255, 237, 0.25);
  background: #02090d;
}

.monitor-video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.osd {
  position: absolute;
  left: 0;
  right: 0;
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #dbf2ff;
  font-size: 12px;
  font-family: Consolas, monospace;
  background: rgba(0, 0, 0, 0.4);
  z-index: 6;
}

.osd.top {
  top: 0;
}

.osd.bottom {
  bottom: 0;
}

.full-btn {
  position: absolute;
  right: 12px;
  bottom: 44px;
  z-index: 8;
}
</style>
