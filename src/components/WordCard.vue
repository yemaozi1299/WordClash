<script setup>
defineProps({
  word: { type: Object, required: true }
})

defineEmits(['close'])
</script>

<template>
  <div class="word-card">
    <div class="card-header">
      <h3 class="word-title">{{ word.word }}</h3>
      <span class="phonetic">{{ word.phonetic }}</span>
    </div>
    <div class="card-body">
      <div class="meaning-list">
        <div v-for="(m, i) in word.meanings" :key="i" class="meaning-item">
          <span class="pos">{{ m.pos }}</span>
          <span class="meaning">{{ m.meaning }}</span>
        </div>
      </div>
      <div v-if="word.exampleSentences?.length" class="card-section">
        <h4>例句</h4>
        <p v-for="(s, i) in word.exampleSentences" :key="i" class="example">{{ s }}</p>
      </div>
      <div v-if="word.synonyms?.length" class="card-section">
        <h4>近义词</h4>
        <p class="synonyms">{{ word.synonyms.join('、') }}</p>
      </div>
      <div v-if="word.etymology" class="card-section">
        <h4>词根词缀</h4>
        <p>{{ word.etymology }}</p>
      </div>
      <div v-if="word.memoryTip" class="card-section">
        <h4>记忆技巧</h4>
        <p>{{ word.memoryTip }}</p>
      </div>
      <div v-if="word.stats" class="card-section stats">
        <span>正确率: {{ word.stats.totalAttempts ? Math.round(word.stats.correctAttempts / word.stats.totalAttempts * 100) : 0 }}%</span>
        <span>出现次数: {{ word.stats.totalAttempts }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.word-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 20px;
}

.card-header {
  margin-bottom: 16px;
}

.word-title {
  font-size: 22px;
  font-weight: 600;
  display: inline;
  margin-right: 12px;
}

.phonetic {
  color: var(--color-text-secondary);
  font-size: 15px;
}

.meaning-item {
  margin-bottom: 6px;
}

.pos {
  display: inline-block;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 8px;
  font-weight: 500;
}

.meaning {
  font-size: 15px;
}

.card-section {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.card-section h4 {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.example {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 4px;
  font-style: italic;
}

.synonyms {
  color: var(--color-primary);
  font-size: 14px;
}

.stats {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
