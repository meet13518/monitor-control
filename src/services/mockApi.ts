import axios from 'axios'

type DetectResult = {
  monitored: boolean
}

type StepResult = {
  success: boolean
}

export type UnlockStep = {
  title: string
  detail: string
}

const steps: UnlockStep[] = [
  { title: '建立去控会话', detail: '下发 UNMON_CTRL_INIT 指令，申请临时管控令牌' },
  { title: '校验 USIM', detail: '读取 IMSI/ICCID 并完成 AKA 鉴权摘要比对' },
  { title: '附着态核验', detail: '确认 EPS Attach=EMM-REGISTERED，追踪 TAI/ECGI' },
  { title: '射频链路体检', detail: '采集 RSRP/RSRQ/SINR，评估上行链路质量' },
  { title: 'PDP 上下文清理', detail: '释放默认承载，注销 APN 监控会话' },
  { title: '中断 RTP 监流', detail: '停止上行镜像流并关闭远程审计端口' },
  { title: '撤销策略路由', detail: '删除 GRE 隧道与 DPI 镜像策略' },
  { title: '重置设备指纹', detail: '刷新终端标识缓存并重建匿名设备签名' },
  { title: '清除 CDR 统计', detail: '归档并清空实时流量计数与会话告警' },
  { title: '回写安全状态', detail: '上报 NOC 去控完成，更新设备状态为 SAFE' },
]

const randomDelay = (min = 200, max = 500) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const mockClient = axios.create({
  adapter: async (config) => {
    await sleep(randomDelay())

    if (config.url === '/api/detect') {
      return {
        data: { monitored: true } satisfies DetectResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }

    if (config.url?.startsWith('/api/unlock/')) {
      return {
        data: { success: true } satisfies StepResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }

    return {
      data: { success: false },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config,
    }
  },
})

export async function detectDevice() {
  const { data } = await mockClient.get<DetectResult>('/api/detect')
  return data
}

export async function runUnlockStep(index: number) {
  const { data } = await mockClient.post<StepResult>(`/api/unlock/${index + 1}`)
  return data
}

export { steps as unlockSteps }
