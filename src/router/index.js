import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/input'
  },
  {
    path: '/input',
    name: 'input',
    component: () => import('@/views/WordInput.vue')
  },
  {
    path: '/matching',
    name: 'matching',
    component: () => import('@/views/MatchingGame.vue')
  },
  {
    path: '/analysis',
    name: 'analysis',
    component: () => import('@/views/Analysis.vue')
  },
  {
    path: '/bank',
    name: 'bank',
    component: () => import('@/views/WordBank.vue')
  }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
