<script setup lang="ts">

import {
  ref,
  onMounted,
  onBeforeUnmount
} from "vue"

import { gatewayUrl } from "@/api/authApi"


interface ServerMetrics {

  cpuUsage: number

  memoryUsage: number

  diskUsage: number

  load1m: number

  networkReceive: number

  networkTransmit: number

  uptime: number
}


const metrics =
  ref<ServerMetrics | null>(null)

const loading =
  ref(true)

const error =
  ref(false)

let refreshTimer:
  ReturnType<typeof setInterval> | null = null


const getMetrics = async () => {

  try {

    error.value = false

    const res =
      await gatewayUrl.get(
        "/api/staff/server"
      )

    metrics.value =
      res.data

  } catch (e) {

    console.error(
      "Monitoring error:",
      e
    )

    error.value = true

  } finally {

    loading.value = false
  }
}


/*
 * Format network
 *
 * bytes/sec
 * → KB/s
 * → MB/s
 * → GB/s
 */
const formatBytes =
  (bytes: number) => {

    if (!bytes || bytes <= 0) {
      return "0 B/s"
    }

    if (bytes < 1024) {

      return (
        bytes.toFixed(0)
        + " B/s"
      )
    }

    if (bytes < 1024 * 1024) {

      return (
        (bytes / 1024)
          .toFixed(2)
        + " KB/s"
      )
    }

    if (
      bytes <
      1024 * 1024 * 1024
    ) {

      return (
        (bytes /
          (1024 * 1024))
          .toFixed(2)
        + " MB/s"
      )
    }

    return (
      (bytes /
        (1024 * 1024 * 1024))
        .toFixed(2)
      + " GB/s"
    )
  }


/*
 * Format uptime
 *
 * seconds
 * → days / hours / minutes
 */
const formatUptime =
  (seconds: number) => {

    if (!seconds) {
      return "0 phút"
    }

    const days =
      Math.floor(
        seconds / 86400
      )

    const hours =
      Math.floor(
        (seconds % 86400) /
        3600
      )

    const minutes =
      Math.floor(
        (seconds % 3600) /
        60
      )

    if (days > 0) {

      return (
        `${days} ngày `
        + `${hours} giờ`
      )
    }

    if (hours > 0) {

      return (
        `${hours} giờ `
        + `${minutes} phút`
      )
    }

    return `${minutes} phút`
  }


/*
 * Màu progress theo %
 */
const getProgressClass =
  (value: number) => {

    if (value >= 90) {
      return "danger"
    }

    if (value >= 70) {
      return "warning"
    }

    return "normal"
  }


onMounted(() => {

  getMetrics()

  /*
   * Refresh mỗi 5 giây.
   *
   * Backend cũng cache 5 giây
   * nên sẽ không spam Prometheus.
   */
  refreshTimer =
    setInterval(
      getMetrics,
      5000
    )
})


onBeforeUnmount(() => {

  if (refreshTimer) {

    clearInterval(
      refreshTimer
    )

    refreshTimer = null
  }
})

</script>


<template>

  <div class="monitoring-container">


    <!-- HEADER -->

    <div class="monitoring-header">

      <div>

        <h2>
          Server Monitoring
        </h2>

        <p>
          Theo dõi tình trạng VPS
        </p>

      </div>

      <div
        v-if="!loading && !error"
        class="status-online"
      >

        <span
          class="status-dot"
        ></span>

        Online

      </div>

      <div
        v-if="error"
        class="status-error"
      >

        <span
          class="status-dot"
        ></span>

        Không kết nối

      </div>

    </div>


    <!-- LOADING -->

    <div
      v-if="loading"
      class="loading-container"
    >

      <div
        class="spinner"
      ></div>

      <span>
        Đang tải thông số server...
      </span>

    </div>


    <!-- ERROR -->

    <div
      v-else-if="error"
      class="error-container"
    >

      Không thể lấy thông số server.

      <button
        @click="getMetrics"
      >
        Thử lại
      </button>

    </div>


    <!-- METRICS -->

    <div
      v-else-if="metrics"
      class="metrics-grid"
    >


      <!-- CPU -->

      <div class="metric-card">

        <div class="metric-header">

          <div
            class="metric-icon cpu"
          >
            CPU
          </div>

          <span>
            CPU Usage
          </span>

        </div>

        <div class="metric-value">

          {{ metrics.cpuUsage.toFixed(1) }}%

        </div>

        <div class="progress">

          <div
            class="progress-bar"
            :class="
              getProgressClass(
                metrics.cpuUsage
              )
            "
            :style="{
              width:
                Math.min(
                  metrics.cpuUsage,
                  100
                ) + '%'
            }"
          ></div>

        </div>

      </div>


      <!-- MEMORY -->

      <div class="metric-card">

        <div class="metric-header">

          <div
            class="metric-icon memory"
          >
            RAM
          </div>

          <span>
            Memory Usage
          </span>

        </div>

        <div class="metric-value">

          {{
            metrics.memoryUsage
              .toFixed(1)
          }}%

        </div>

        <div class="progress">

          <div
            class="progress-bar"
            :class="
              getProgressClass(
                metrics.memoryUsage
              )
            "
            :style="{
              width:
                Math.min(
                  metrics.memoryUsage,
                  100
                ) + '%'
            }"
          ></div>

        </div>

      </div>


      <!-- DISK -->

      <div class="metric-card">

        <div class="metric-header">

          <div
            class="metric-icon disk"
          >
            DISK
          </div>

          <span>
            Disk Usage
          </span>

        </div>

        <div class="metric-value">

          {{
            metrics.diskUsage
              .toFixed(1)
          }}%

        </div>

        <div class="progress">

          <div
            class="progress-bar"
            :class="
              getProgressClass(
                metrics.diskUsage
              )
            "
            :style="{
              width:
                Math.min(
                  metrics.diskUsage,
                  100
                ) + '%'
            }"
          ></div>

        </div>

      </div>


      <!-- LOAD -->

      <div class="metric-card">

        <div class="metric-header">

          <div
            class="metric-icon load"
          >
            LOAD
          </div>

          <span>
            Load Average
          </span>

        </div>

        <div class="metric-value">

          {{ metrics.load1m.toFixed(2) }}

        </div>

        <div class="metric-description">

          Load 1 phút

        </div>

      </div>


      <!-- NETWORK RX -->

      <div class="metric-card">

        <div class="metric-header">

          <div
            class="metric-icon network"
          >
            ↓
          </div>

          <span>
            Network Receive
          </span>

        </div>

        <div class="metric-value network-value">

          {{
            formatBytes(
              metrics.networkReceive
            )
          }}

        </div>

        <div class="metric-description">

          Download

        </div>

      </div>


      <!-- NETWORK TX -->

      <div class="metric-card">

        <div class="metric-header">

          <div
            class="metric-icon network"
          >
            ↑
          </div>

          <span>
            Network Transmit
          </span>

        </div>

        <div class="metric-value network-value">

          {{
            formatBytes(
              metrics.networkTransmit
            )
          }}

        </div>

        <div class="metric-description">

          Upload

        </div>

      </div>


      <!-- UPTIME -->

      <div class="metric-card uptime-card">

        <div class="metric-header">

          <div
            class="metric-icon uptime"
          >
            ↑
          </div>

          <span>
            Server Uptime
          </span>

        </div>

        <div class="metric-value">

          {{
            formatUptime(
              metrics.uptime
            )
          }}

        </div>

        <div class="metric-description">

          Thời gian server hoạt động

        </div>

      </div>


    </div>

  </div>

</template>


<style scoped>

.monitoring-container {

  padding: 24px;

  background: #f8fafc;

  min-height: 100%;

}


/* HEADER */

.monitoring-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 24px;

}

.monitoring-header h2 {

  margin: 0;

  font-size: 26px;

  font-weight: 700;

  color: #1e293b;

}

.monitoring-header p {

  margin: 5px 0 0;

  color: #64748b;

}


/* STATUS */

.status-online,
.status-error {

  display: flex;

  align-items: center;

  gap: 8px;

  padding: 8px 14px;

  border-radius: 20px;

  font-size: 14px;

  font-weight: 600;

}

.status-online {

  background: #dcfce7;

  color: #166534;

}

.status-error {

  background: #fee2e2;

  color: #991b1b;

}

.status-dot {

  width: 8px;

  height: 8px;

  border-radius: 50%;

  background: currentColor;

}


/* GRID */

.metrics-grid {

  display: grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(250px, 1fr)
    );

  gap: 18px;

}


/* CARD */

.metric-card {

  background: white;

  border-radius: 18px;

  padding: 20px;

  box-shadow:
    0 4px 16px
    rgba(
      15,
      23,
      42,
      0.06
    );

  border:
    1px solid #e2e8f0;

}

.metric-header {

  display: flex;

  align-items: center;

  gap: 10px;

  color: #64748b;

  font-size: 14px;

  font-weight: 600;

}

.metric-icon {

  width: 42px;

  height: 42px;

  border-radius: 12px;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 11px;

  font-weight: 800;

  background: #eef2ff;

  color: #4f46e5;

}

.metric-value {

  margin-top: 18px;

  font-size: 30px;

  font-weight: 700;

  color: #1e293b;

}

.network-value {

  font-size: 24px;

}


/* PROGRESS */

.progress {

  height: 8px;

  margin-top: 14px;

  background: #e2e8f0;

  border-radius: 10px;

  overflow: hidden;

}

.progress-bar {

  height: 100%;

  border-radius: 10px;

  transition:
    width .5s ease;

}

.progress-bar.normal {

  background:
    linear-gradient(
      90deg,
      #22c55e,
      #4f8cff
    );

}

.progress-bar.warning {

  background:
    linear-gradient(
      90deg,
      #f59e0b,
      #f97316
    );

}

.progress-bar.danger {

  background:
    linear-gradient(
      90deg,
      #ef4444,
      #dc2626
    );

}


/* DESCRIPTION */

.metric-description {

  margin-top: 8px;

  color: #94a3b8;

  font-size: 13px;

}


/* LOADING */

.loading-container {

  min-height: 300px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 12px;

  color: #64748b;

}

.spinner {

  width: 36px;

  height: 36px;

  border:
    4px solid #e2e8f0;

  border-top-color:
    #4f8cff;

  border-radius: 50%;

  animation:
    spin .8s linear infinite;

}

@keyframes spin {

  to {

    transform:
      rotate(360deg);

  }

}


/* ERROR */

.error-container {

  padding: 40px;

  text-align: center;

  color: #64748b;

}

.error-container button {

  margin-left: 10px;

  padding: 8px 16px;

  border: none;

  border-radius: 10px;

  background: #4f8cff;

  color: white;

  cursor: pointer;

}


/* MOBILE */

@media (
max-width: 768px
) {

  .monitoring-container {

    padding: 16px;

  }

  .monitoring-header {

    align-items: flex-start;

    gap: 15px;

  }

  .monitoring-header h2 {

    font-size: 22px;

  }

  .metrics-grid {

    grid-template-columns:
      1fr;

  }

}

</style>
