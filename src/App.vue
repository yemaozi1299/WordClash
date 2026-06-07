<script setup>
import SideNav from '@/components/SideNav.vue'
</script>

<template>
  <div class="app-layout">
    <SideNav />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --sidebar-width: 200px;
  --color-bg: #f8f9fa;
  --color-surface: #ffffff;
  --color-text: #2c3e50;
  --color-text-secondary: #6c757d;
  --color-primary: #4a90d9;
  --color-primary-light: #e8f0fe;
  --color-danger: #e74c3c;
  --color-success: #27ae60;
  --color-border: #e9ecef;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  min-height: 100vh;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: 40px;
  max-width: 960px;
}
</style>
