<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import MonitorScreen from './components/MonitorScreen.vue'
import { detectDevice, runUnlockStep, unlockSteps } from './services/mockApi'

type DetectStatus = 'detecting' | 'monitored' | 'safe'
type ConsoleLog = {
  id: number
  time: string
  text: string
  status: 'pending' | 'success'
}

const detectStatus = ref<DetectStatus>('detecting')
const deviceId = `4G-${Math.random().toString(16).slice(2, 10).toUpperCase()}`
const connected = ref(false)
const processing = ref(false)
const logs = ref<ConsoleLog[]>([])
const progress = ref(0)
const consoleBodyRef = ref<HTMLDivElement>()

const canUnlock = computed(() => detectStatus.value === 'monitored' && connected.value && !processing.value)

const appendLog = (text: string, status: 'pending' | 'success' = 'success') => {
  logs.value.push({
    id: Date.now() + logs.value.length,
    time: dayjs().format('HH:mm:ss'),
    text,
    status,
  })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const sampleMetrics = [
  'RSRP=-86dBm, RSRQ=-9dB, SINR=17.4dB',
  'EMM_CAUSE=0x00, NAS_STATE=REGISTERED',
  'APN=cmnet, PDP_CID=1, QCI=9',
  'RTP_STREAM=0x28A1, RTCP_LOSS=0.02%',
  'DPI_POLICY=mirror_drop, GRE_TUNNEL=disabled',
  'CDR_DELTA=0, FLOW_COUNTER=flush_ok',
  'NOC_ACK=200, SAFE_FLAG=TRUE',
]

const englishTelemetry = [
  'PLMN=460-00, TAC=0x1A32, ECGI=46000123456789',
  'USIM_AUTH=AKA_PASS, KASME_REFRESH=OK',
  'ENB_ID=0x17B1, EARFCN_DL=1800, BAND=B3',
  'TLS_TUNNEL=ESTABLISHED, MTLS_CN=noc-core',
  'IPSEC_SPI_IN=0xC1A44F22, SPI_OUT=0xC1A44F23',
  'FW_RULE=DROP_REMOTE_PROBE, ACL_VERSION=v2.31',
  'HEARTBEAT_RTT=21ms, JITTER=2.1ms',
]

const lteCoreMetrics = [
  'MME_ID=MME-SH-03, SGW=10.18.2.31, PGW=10.18.8.9',
  'EPS_BEARER_ID=5, ARP=6, GBR=0kbps, MBR=2048kbps',
  'RRC_STATE=CONNECTED, DRX=enabled, TAU_TIMER=T3412:54m',
  'S1AP_CAUSE=normal-release, S_TMSI=0xA9F138B2',
  'CELL_LOAD_DL=37%, CELL_LOAD_UL=22%, PRB_UTIL=41%',
  'X2_HO_STATE=IDLE, ENB_NEIGHBOR=0x17B2, PCI=126',
]

const iotMetrics = [
  'PROTO=MQTT 3.1.1, BROKER=iot-gw.local:1883, TLS=OFF',
  'CLIENT_ID=sensor-node-4g-07, KEEPALIVE=60s, CLEAN_SESSION=1',
  'TOPIC=telemetry/device/upstream, QOS=1, RETAIN=0',
  'COAP_ENDPOINT=/v1/dev/shadow, DTLS=disabled, MID=0x12AC',
  'LWM2M_VER=1.1, REG_LIFETIME=300s, BINDING=UQ',
  'DEVICE_TWIN_SYNC=OK, SHADOW_VERSION=1842, DELTA=0',
]

const simAndSecurityMetrics = [
  'IMSI=4600019********, ICCID=898600************',
  'IMEI=86*************, SVN=27, MODEM_FW=MEC-A1.4.9',
  'AUTH_ALGO=MILENAGE, CK/IK=valid, SQN_WINDOW=pass',
  'AES_CTX_ROTATE=done, KEY_SLOT=K3, HMAC_SHA256=verified',
  'FIREWALL_ZONE=EDGE-IOT, POLICY_HIT=RULE_1042',
  'REMOTE_CTRL_SIG=revoked, TOKEN_TTL=0, AUDIT=sealed',
]

const runDetect = async () => {
  detectStatus.value = 'detecting'
  const result = await detectDevice()
  detectStatus.value = result.monitored ? 'monitored' : 'safe'
}

const connectDevice = async () => {
  if (connected.value) return
  appendLog('CONNECT START | CHANNEL=4G-LTE | AUTH=USIM_AKA', 'pending')
  await sleep(900)
  connected.value = true
  appendLog('CONNECT OK | SESSION_ID=LTE-CTRL-8821 | STATE=READY', 'success')
  appendLog('TIP | Press Enter to start unlock workflow', 'success')
  message.success('设备连接成功，按 Enter 执行去控')
}

const handleUnlock = async () => {
  if (!canUnlock.value) return
  const totalDurationMs = 15_000
  const stepDurationMs = Math.floor(totalDurationMs / unlockSteps.length)

  processing.value = true
  if (logs.value.length > 80) {
    logs.value = logs.value.slice(-20)
  }
  progress.value = 0
  appendLog('进入去控维护窗口，控制链路已切换到安全通道', 'success')
  appendLog('SESSION INIT | TASK=UNMON_CTRL | OPERATOR=admin | MODE=MAINTENANCE', 'success')
  appendLog('BOOTSTRAP | PROFILE=LTE-IOT | STACK=NAS/RRC/S1AP/MQTT | REGION=CN-EAST', 'success')

  for (let i = 0; i < unlockSteps.length; i += 1) {
    const stepStart = Date.now()
    appendLog(`[${i + 1}/${unlockSteps.length}] ${unlockSteps[i].title} - 执行中`, 'pending')
    await runUnlockStep(i)
    const last = logs.value[logs.value.length - 1]
    if (last) {
      last.status = 'success'
      last.text = `[${i + 1}/${unlockSteps.length}] ${unlockSteps[i].title} - 已完成`
    }
    appendLog(`  └─ ${unlockSteps[i].detail} | ${sampleMetrics[i % sampleMetrics.length]}`, 'success')
    appendLog(`  └─ TELEMETRY: ${englishTelemetry[i % englishTelemetry.length]}`, 'success')
    appendLog(`  └─ LTE_CORE: ${lteCoreMetrics[i % lteCoreMetrics.length]}`, 'success')
    appendLog(`  └─ IOT_STACK: ${iotMetrics[i % iotMetrics.length]}`, 'success')
    appendLog(`  └─ SIM_SEC: ${simAndSecurityMetrics[i % simAndSecurityMetrics.length]}`, 'success')
    appendLog(
      `  └─ TRACE_ID=UNLOCK-${String(i + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)} | STATUS=SUCCESS`,
      'success',
    )

    const elapsed = Date.now() - stepStart
    const remaining = stepDurationMs - elapsed
    if (remaining > 0) {
      await sleep(remaining)
    }

    progress.value = Math.round(((i + 1) / unlockSteps.length) * 100)
  }

  appendLog('RESULT=SUCCESS | 去控完成，设备已解除监控', 'success')
  processing.value = false
  detectStatus.value = 'safe'
  message.success('去控完成，设备已解除监控')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter') return
  if (!canUnlock.value) return
  event.preventDefault()
  handleUnlock()
}

watch(
  () => logs.value.length,
  async () => {
    await nextTick()
    if (consoleBodyRef.value) {
      consoleBodyRef.value.scrollTop = consoleBodyRef.value.scrollHeight
    }
  },
)

onMounted(() => {
  runDetect()
  connectDevice()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="page">
    <section class="console-panel">
      <a-progress :percent="progress" size="small" :status="processing ? 'active' : 'success'" />

      <div ref="consoleBodyRef" class="inline-console">
        <div v-for="item in logs" :key="item.id" class="console-line">
          <span class="line-time">{{ item.time }}</span>
          <span :class="['dot', item.status]">{{ item.status === 'success' ? '●' : '○' }}</span>
          <span class="line-text">{{ item.text }}</span>
        </div>
        <div v-if="processing" class="console-line running">PROCESSING...</div>
      </div>
    </section>

    <section class="monitor-panel">
      <MonitorScreen :device-id="deviceId" />
    </section>
  </div>
</template>
