import { useEffect, useState } from 'react'
import type { AnalyzedGame, Color, PatternAnalysis } from '@/types'
import { useApp } from '@/store/useApp'
import { useSettings } from '@/store/useSettings'
import { analyzeGame, computePatterns, type AnalyzeProgress } from '@/lib/analysis'
import { clearAll, deleteGame, getGames, getPatterns, saveGame, setPatterns as persistPatterns } from '@/lib/storage'
import Header from '@/components/Header'
import ImportScreen from '@/screens/ImportScreen'
import AnalyzingScreen from '@/screens/AnalyzingScreen'
import StudyScreen from '@/screens/StudyScreen'
import HistoryScreen from '@/screens/HistoryScreen'
import SettingsScreen from '@/screens/SettingsScreen'

export default function App() {
  const {
    view,
    activeGame,
    currentPointIndex,
    lastSaveDuplicate,
    setView,
    openGame,
    closeGame,
    setPointIndex,
    nextPoint,
    prevPoint,
  } = useApp()

  const { apiKey, model, engineDepth, setApiKey, setModel, setEngineDepth } = useSettings()

  const [games, setGames] = useState<AnalyzedGame[]>([])
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null)
  const [patternsLoading, setPatternsLoading] = useState(false)
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apiKeyMissing = apiKey.trim().length === 0

  // Carrega dados salvos
  useEffect(() => {
    void (async () => {
      setGames(await getGames())
      setPatterns(await getPatterns())
    })()
  }, [])

  async function refreshPatterns(list: AnalyzedGame[]) {
    if (list.length === 0 || apiKeyMissing) return
    setPatternsLoading(true)
    try {
      const p = await computePatterns(list, apiKey, model)
      setPatterns(p)
      await persistPatterns(p)
    } catch (err) {
      console.warn('Falha ao calcular padrões:', err)
    } finally {
      setPatternsLoading(false)
    }
  }

  async function handleAnalyze(pgn: string, color: Color) {
    setError(null)
    setProgress(null)
    setView('analyzing')
    try {
      const analyzed = await analyzeGame({
        pgn,
        userColor: color,
        apiKey,
        model,
        depth: engineDepth,
        onProgress: setProgress,
      })
      const { duplicate, game } = await saveGame(analyzed)
      const list = await getGames()
      setGames(list)
      openGame(duplicate ? game : analyzed, duplicate)
      if (!duplicate) void refreshPatterns(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui analisar esta partida.')
      setView('import')
    }
  }

  async function handleDelete(id: string) {
    await deleteGame(id)
    setGames(await getGames())
  }

  async function handleClearData() {
    await clearAll()
    setGames([])
    setPatterns(null)
  }

  function renderView() {
    switch (view) {
      case 'analyzing':
        return <AnalyzingScreen progress={progress} />
      case 'study':
        return activeGame ? (
          <StudyScreen
            game={activeGame}
            pointIndex={currentPointIndex}
            duplicate={lastSaveDuplicate}
            onPrevPoint={prevPoint}
            onNextPoint={nextPoint}
            onSelectPoint={setPointIndex}
            onClose={closeGame}
          />
        ) : (
          <ImportScreen
            apiKeyMissing={apiKeyMissing}
            error={error}
            onAnalyze={handleAnalyze}
            onGoSettings={() => setView('settings')}
          />
        )
      case 'history':
        return (
          <HistoryScreen
            games={games}
            patterns={patterns}
            patternsLoading={patternsLoading}
            apiKeyMissing={apiKeyMissing}
            onOpen={(g) => openGame(g, false)}
            onDelete={handleDelete}
            onRefreshPatterns={() => void refreshPatterns(games)}
          />
        )
      case 'settings':
        return (
          <SettingsScreen
            apiKey={apiKey}
            model={model}
            engineDepth={engineDepth}
            setApiKey={setApiKey}
            setModel={setModel}
            setEngineDepth={setEngineDepth}
            onClearData={handleClearData}
          />
        )
      default:
        return (
          <ImportScreen
            apiKeyMissing={apiKeyMissing}
            error={error}
            onAnalyze={handleAnalyze}
            onGoSettings={() => setView('settings')}
          />
        )
    }
  }

  return (
    <div className="min-h-full">
      <Header view={view} onNav={(v) => setView(v)} />
      <main className="mx-auto max-w-6xl px-4 py-5">{renderView()}</main>
    </div>
  )
}
