<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/input', label: '单词录入', icon: '✏️' },
  { path: '/matching', label: '对对碰', icon: '🎯' },
  { path: '/analysis', label: '学习分析', icon: '📊' },
  { path: '/bank', label: '单词库', icon: '📚' }
]
</script>

<template>
  <nav class="sidebar">
    <div class="sidebar-brand">
      <span class="brand-icon">🔤</span>
      <span class="brand-text">WordClash</span>
    </div>
    <ul class="nav-list">
      <li v-for="item in navItems" :key="item.path">
        <router-link
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.sidebar-brand {
  padding: 0 20px 24px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 24px;
}

.brand-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.nav-list {
  list-style: none;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}

.nav-item:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
}
</style>
