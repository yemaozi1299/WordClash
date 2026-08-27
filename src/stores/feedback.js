import { defineStore } from 'pinia'
import { ref } from 'vue'

let toastSeed = 0
let confirmResolver = null

export const useFeedbackStore = defineStore('feedback', () => {
  const toasts = ref([])
  const confirmState = ref({
    visible: false,
    title: '',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    tone: 'primary'
  })

  function showToast(options) {
    const toast = {
      id: ++toastSeed,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message || '',
      duration: options.duration ?? 2400
    }

    toasts.value.push(toast)

    if (toast.duration > 0) {
      window.setTimeout(() => {
        dismissToast(toast.id)
      }, toast.duration)
    }

    return toast.id
  }

  function dismissToast(id) {
    toasts.value = toasts.value.filter(item => item.id !== id)
  }

  function success(message, title = '操作成功') {
    showToast({ type: 'success', title, message })
  }

  function error(message, title = '操作失败') {
    showToast({ type: 'error', title, message, duration: 3200 })
  }

  function info(message, title = '提示') {
    showToast({ type: 'info', title, message })
  }

  function warning(message, title = '请注意') {
    showToast({ type: 'warning', title, message, duration: 3200 })
  }

  function requestConfirm(options = {}) {
    if (confirmResolver) {
      confirmResolver(false)
      confirmResolver = null
    }

    confirmState.value = {
      visible: true,
      title: options.title || '确认操作',
      message: options.message || '',
      confirmText: options.confirmText || '确认',
      cancelText: options.cancelText || '取消',
      tone: options.tone || 'primary'
    }

    return new Promise(resolve => {
      confirmResolver = resolve
    })
  }

  function resolveConfirm(result) {
    if (confirmResolver) {
      confirmResolver(result)
      confirmResolver = null
    }

    confirmState.value = {
      visible: false,
      title: '',
      message: '',
      confirmText: '确认',
      cancelText: '取消',
      tone: 'primary'
    }
  }

  return {
    toasts,
    confirmState,
    showToast,
    dismissToast,
    success,
    error,
    info,
    warning,
    requestConfirm,
    resolveConfirm
  }
})
