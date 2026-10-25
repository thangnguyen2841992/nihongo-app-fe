<script setup lang="ts">
import { computed } from 'vue'
import { bookAiAnswer, type AiExercise } from '@/services/bookAiAnswers'
const props = defineProps<{ exercise: AiExercise; visible: boolean; answerKeyHidden?: boolean }>()
const solution = computed(() => props.visible ? bookAiAnswer(props.exercise, props.answerKeyHidden) : undefined)
</script>

<template>
  <details v-if="solution" class="ai-solution">
    <summary>{{ solution.correctAnswer ? 'Xem đáp án và giải thích của AI' : 'Câu đang chờ kiểm tra' }}</summary>
    <p v-if="solution.correctAnswer" class="ai-key">Đáp án AI: {{ solution.correctAnswer }} ({{ 'ABCD'.indexOf(solution.correctAnswer) + 1 }})</p>
    <p>{{ solution.explanation }}</p>
    <p v-if="solution.evidence" class="ai-evidence" lang="ja">{{ solution.evidence }}</p>
    <p class="ai-source">AI tự giải từ đề bài; chưa đối chiếu đáp án chính thức của sách.</p>
  </details>
</template>

<style scoped>
.ai-solution { margin-top: 16px; border-left: 3px solid var(--learn-subtle); padding: 8px 16px; background: var(--learn-surface-muted); line-height: 1.8; }
summary { cursor: pointer; color: var(--learn-heading); font-weight: 600; }
p { margin: 8px 0; white-space: pre-line; overflow-wrap: anywhere; }
.ai-key { color: #166534; font-weight: 600; }
.ai-evidence { color: var(--learn-heading); }.ai-source { font-size: 12px; color: var(--learn-muted); }
</style>
