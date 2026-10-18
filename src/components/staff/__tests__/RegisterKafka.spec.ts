import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RegisterKafka from '../monitor/RegisterKafka.vue'
import {
  listKafkaTargets,
  probeKafkaTarget,
  registerKafkaTarget,
  replaceKafkaTargetCredentials,
} from '@/monitor/kafkaTargetService'

vi.mock('@/monitor/kafkaTargetService', () => ({
  listKafkaTargets: vi.fn(),
  probeKafkaTarget: vi.fn(),
  registerKafkaTarget: vi.fn(),
  replaceKafkaTargetCredentials: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

it('checks Kafka before registering and clears the password afterwards', async () => {
  vi.mocked(listKafkaTargets).mockResolvedValue([])
  vi.mocked(probeKafkaTarget).mockResolvedValue({
    clusterId: 'prod-1', brokerCount: 3, controllerId: 1, topicCount: 12,
    partitionCount: 48, consumerGroupCount: 4,
  })
  vi.mocked(registerKafkaTarget).mockResolvedValue({
    vpsId: 8, hostname: 'Kafka chính', ipAddress: 'broker-a', agentPort: 9093,
    bootstrapServers: 'broker-a:9093,broker-b:9093', securityProtocol: 'SASL_SSL',
    saslMechanism: 'SCRAM-SHA-512',
    exporterType: 'KAFKA_ADMIN', osType: 'Kafka', osVersion: 'prod-1', architecture: '',
    status: 'UP', lastSeenAt: '',
  })
  const wrapper = mount(RegisterKafka, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  await wrapper.get('#kafka-name').setValue('Kafka chính')
  await wrapper.get('#kafka-brokers').setValue('broker-a:9093,broker-b:9093')
  await wrapper.get('#kafka-user').setValue('monitor')
  await wrapper.get('#kafka-password').setValue('secret')
  expect(wrapper.get('.primary').attributes('disabled')).toBeDefined()

  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(probeKafkaTarget).toHaveBeenCalledWith(expect.objectContaining({
    bootstrapServers: 'broker-a:9093,broker-b:9093', securityProtocol: 'SASL_SSL',
    saslMechanism: 'SCRAM-SHA-512', username: 'monitor',
  }))
  expect(wrapper.get('.probe').text()).toContain('48')
  await wrapper.get('.primary').trigger('click')
  await flushPromises()
  expect(registerKafkaTarget).toHaveBeenCalledOnce()
  expect((wrapper.get('#kafka-password').element as HTMLInputElement).value).toBe('')
  expect(wrapper.get('.success').text()).toContain('Kafka chính')
  wrapper.unmount()
})

it('updates credentials only for an existing SASL target', async () => {
  vi.mocked(listKafkaTargets).mockResolvedValue([{
    vpsId: 8, hostname: 'Kafka chính', ipAddress: 'broker-a', agentPort: 9093,
    bootstrapServers: 'broker-a:9093,broker-b:9093', securityProtocol: 'SASL_SSL',
    saslMechanism: 'SCRAM-SHA-512', exporterType: 'KAFKA_ADMIN', osType: 'Kafka',
    osVersion: 'prod-1', architecture: '', status: 'UP', lastSeenAt: '',
  }])
  vi.mocked(replaceKafkaTargetCredentials).mockResolvedValue()
  const wrapper = mount(RegisterKafka, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  await wrapper.get('.list tbody button').trigger('click')
  await wrapper.get('#kafka-replacement-user').setValue('new-monitor')
  await wrapper.get('#kafka-replacement-password').setValue('new-secret')
  await wrapper.get('[role=dialog] form').trigger('submit')
  await flushPromises()

  expect(replaceKafkaTargetCredentials).toHaveBeenCalledWith(8, 'new-monitor', 'new-secret')
  expect(registerKafkaTarget).not.toHaveBeenCalled()
  expect(wrapper.find('[role=dialog]').exists()).toBe(false)
  expect(wrapper.get('[role=status]').text()).toContain('Đã cập nhật tài khoản SASL')
  wrapper.unmount()
})
