import { ref } from 'vue'

export const japaneseAiPopupOpen = ref(false)
export const japaneseAiPopupQuery = ref('')
export const japaneseAiPopupMounted = ref(false)

export function openJapaneseAiPopup(query = '') {
  const value = query.trim()
  if (value) japaneseAiPopupQuery.value = value
  japaneseAiPopupMounted.value = true
  japaneseAiPopupOpen.value = true
}

export function closeJapaneseAiPopup() {
  japaneseAiPopupOpen.value = false
}
