import { useWordsStore } from '@/stores/words.js'
import { useArticlesStore } from '@/stores/articles.js'
import { loadAppData, saveAppData } from '@/services/storage.js'

export function hydrateAppStores(appData, options = {}) {
  const wordsStore = useWordsStore()
  const articlesStore = useArticlesStore()
  const { force = true, persist = false } = options

  wordsStore.hydrate(appData?.words || [], { force, persist })
  articlesStore.hydrate(appData?.articles || [], { force, persist })
}

export function initializeAppStores(force = false) {
  const appData = loadAppData()
  hydrateAppStores(appData, { force, persist: false })
  return appData
}

export function applyImportedAppData(appData) {
  hydrateAppStores(appData, { force: true, persist: false })
  saveAppData(appData)
  return appData
}
