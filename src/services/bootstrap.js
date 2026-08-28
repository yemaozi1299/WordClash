import { useWordsStore } from '@/stores/words.js'
import { useArticlesStore } from '@/stores/articles.js'

export function initializeAppStores() {
  const wordsStore = useWordsStore()
  const articlesStore = useArticlesStore()

  wordsStore.init()
  articlesStore.init()
}
