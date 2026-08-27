<script setup>
defineProps({
  word: { type: Object, required: true }
})

defineEmits(['close'])
</script>

<template>
  <div class="word-card">
    <div class="card-header">
      <div>
        <h3 class="word-title">{{ word.word }}</h3>
        <span class="phonetic">{{ word.phonetic || '暂无音标' }}</span>
      </div>
      <div v-if="word.stats" class="stats-pill">
        <span>正确率 {{ word.stats.totalAttempts ? Math.round(word.stats.correctAttempts / word.stats.totalAttempts * 100) : 0 }}%</span>
      </div>
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
        <span>出现次数：{{ word.stats.totalAttempts }}</span>
        <span>连续答对：{{ word.stats.consecutiveCorrect }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.word-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 251, 255, 0.98));
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 22px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.word-title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 6px;
}

.phonetic {
  display: inline-block;
  color: var(--color-text-secondary);
  font-size: 15px;
}

.stats-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
}

.meaning-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.pos {
  display: inline-flex;
  align-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: 700;
}

.meaning {
  font-size: 15px;
  line-height: 1.7;
}

.card-section {
  margin-top: 16px;
  padding-top: 16px;
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
  margin-bottom: 6px;
  font-style: italic;
  line-height: 1.7;
}

.synonyms {
  color: var(--color-primary);
  font-size: 14px;
  line-height: 1.7;
}

.stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
