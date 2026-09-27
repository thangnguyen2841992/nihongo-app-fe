<script setup lang="ts">
withDefaults(defineProps<{ light?: boolean }>(), { light: false })
</script>

<template>
  <span class="nihongo-logo" :class="{ 'on-dark': light }" aria-label="NihongoApp">
    <img src="/nihongo-mark.svg" class="logo-mark" alt="" width="42" height="42" />
    <span class="logo-type" aria-hidden="true">
      <span class="logo-name">nihongo<span class="logo-period">.</span></span>
      <span class="logo-tagline">HỌC TIẾNG NHẬT MỖI NGÀY</span>
    </span>
  </span>
</template>

<style scoped>
.nihongo-logo { display: inline-flex; align-items: center; gap: 10px; vertical-align: middle; white-space: nowrap; }
.logo-mark { display: block; flex-shrink: 0; width: 42px; height: 42px; }
.logo-type { display: flex; flex-direction: column; gap: 4px; }
.logo-name { color: #253b68; font-family: 'Trebuchet MS', 'Segoe UI', sans-serif; font-size: 27px; line-height: 1; font-weight: 800; letter-spacing: -1.3px; }
.logo-period { color: #e98276; }
.logo-tagline { color: #8794ab; font-size: 7px; font-weight: 650; letter-spacing: 1.1px; line-height: 1.2; }
.on-dark .logo-name { color: #f6f5f0; }
.on-dark .logo-tagline { color: #b9c5d8; }
@media (max-width: 480px) { .logo-mark { width: 35px; height: 35px; } .logo-name { font-size: 23px; } .logo-tagline { font-size: 6px; letter-spacing: .8px; } .nihongo-logo { gap: 8px; } }
</style>
