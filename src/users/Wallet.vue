<script setup lang="ts">

import {onMounted, ref} from 'vue'
import {
  getWallet,
  depositWallet,
  type WalletResponse
} from '@/services/walletApi.ts'

const wallet = ref<WalletResponse | null>(null)

const loading = ref(false)
const depositLoading = ref(false)

const error = ref('')
const success = ref('')

const amount = ref<number | null>(null)
const description = ref('')

/**
 * Lấy userId.
 *
 * Tạm thời lấy từ sessionStorage.
 * Sau này nên lấy từ authState/store.
 */
const userId = Number(
  sessionStorage.getItem('userId')
)

/**
 * Load wallet
 */
const loadWallet = async () => {

  if (!userId) {
    error.value = 'Không xác định được người dùng'
    return
  }

  loading.value = true
  error.value = ''

  try {

    wallet.value = await getWallet(userId)

  } catch (e: any) {

    console.error(e)

    error.value =
      e?.response?.data?.message ||
      'Không thể tải thông tin ví'

  } finally {

    loading.value = false
  }
}

/**
 * Nạp tiền
 */
const handleDeposit = async () => {

  error.value = ''
  success.value = ''

  if (!amount.value || amount.value <= 0) {

    error.value = 'Vui lòng nhập số tiền hợp lệ'
    return
  }

  depositLoading.value = true

  try {

    wallet.value = await depositWallet(
      userId,
      {
        amount: amount.value,
        description: description.value
      }
    )

    success.value =
      'Nạp tiền thành công'

    amount.value = null
    description.value = ''

  } catch (e: any) {

    console.error(e)

    error.value =
      e?.response?.data?.message ||
      'Nạp tiền thất bại'

  } finally {

    depositLoading.value = false
  }
}

const formatMoney = (value: number) => {

  return new Intl.NumberFormat(
    'vi-VN',
    {
      style: 'currency',
      currency: 'VND'
    }
  ).format(value)
}

onMounted(() => {
  loadWallet()
})

</script>

<template>

  <div class="container py-4">

    <div class="row justify-content-center">

      <div class="col-lg-7">

        <!-- TITLE -->

        <div class="mb-4">

          <h2 class="fw-bold mb-1">
            Ví của tôi
          </h2>

          <p class="text-muted mb-0">
            Quản lý số dư và nạp tiền để mua khóa học
          </p>

        </div>


        <!-- ERROR -->

        <div
          v-if="error"
          class="alert alert-danger"
        >
          {{ error }}
        </div>


        <!-- SUCCESS -->

        <div
          v-if="success"
          class="alert alert-success"
        >
          {{ success }}
        </div>


        <!-- WALLET -->

        <div
          class="card border-0 shadow-sm mb-4"
        >

          <div class="card-body p-4">

            <div
              class="d-flex justify-content-between align-items-center"
            >

              <div>

                <div class="text-muted mb-2">
                  Số dư hiện tại
                </div>

                <div
                  v-if="loading"
                  class="placeholder-glow"
                >
                  <span
                    class="placeholder col-6"
                  ></span>
                </div>

                <h2
                  v-else
                  class="fw-bold mb-0"
                >
                  {{
                    formatMoney(
                      wallet?.balance ?? 0
                    )
                  }}
                </h2>

              </div>

              <div
                class="fs-1"
              >
                💰
              </div>

            </div>

          </div>

        </div>


        <!-- DEPOSIT -->

        <div class="card border-0 shadow-sm">

          <div class="card-body p-4">

            <h5 class="fw-bold mb-4">
              Nạp tiền
            </h5>


            <!-- QUICK AMOUNT -->

            <div class="mb-3">

              <label class="form-label">
                Chọn số tiền
              </label>

              <div class="d-flex flex-wrap gap-2">

                <button
                  type="button"
                  class="btn btn-outline-primary"
                  @click="amount = 100000"
                >
                  100.000đ
                </button>

                <button
                  type="button"
                  class="btn btn-outline-primary"
                  @click="amount = 200000"
                >
                  200.000đ
                </button>

                <button
                  type="button"
                  class="btn btn-outline-primary"
                  @click="amount = 500000"
                >
                  500.000đ
                </button>

                <button
                  type="button"
                  class="btn btn-outline-primary"
                  @click="amount = 1000000"
                >
                  1.000.000đ
                </button>

              </div>

            </div>


            <!-- AMOUNT -->

            <div class="mb-3">

              <label
                for="amount"
                class="form-label"
              >
                Số tiền nạp
              </label>

              <div class="input-group">

                <input
                  id="amount"
                  v-model.number="amount"
                  type="number"
                  min="1000"
                  class="form-control"
                  placeholder="Nhập số tiền"
                />

                <span class="input-group-text">
                  VNĐ
                </span>

              </div>

            </div>


            <!-- DESCRIPTION -->

            <div class="mb-4">

              <label
                for="description"
                class="form-label"
              >
                Ghi chú
              </label>

              <input
                id="description"
                v-model="description"
                type="text"
                class="form-control"
                placeholder="Ví dụ: Nạp tiền mua khóa học N5"
              />

            </div>


            <!-- BUTTON -->

            <button
              type="button"
              class="btn btn-primary w-100"
              :disabled="depositLoading"
              @click="handleDeposit"
            >

              <span
                v-if="depositLoading"
                class="spinner-border spinner-border-sm me-2"
              ></span>

              {{
                depositLoading
                  ? 'Đang xử lý...'
                  : 'Nạp tiền'
              }}

            </button>

          </div>

        </div>

      </div>

    </div>

  </div>

</template>
