import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [puzzle, setPuzzle] = useState(null)
  const [answers, setAnswers] = useState([])
  const [found, setFound] = useState([])
  const [guess, setGuess] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [strikes, setStrikes] = useState(0)
  const [maxStrikes, setMaxStrikes] = useState(9)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    async function load() {
      const today = new Date().toLocaleDateString('en-CA')
      const { data: puzzleData } = await supabase
        .from('puzzles')
        .select('*')
        .eq('date', today)
        .single()
      if (!puzzleData) return
      setPuzzle(puzzleData)

      const { data: answerData } = await supabase
        .from('player_seasons')
        .select('*, players(name)')
        .in('id', puzzleData.answer_ids)
        .order('ppg', { ascending: false })
      
      // deduplicate by player name, keep best PPG season
      const seen = new Set()
      const unique = []
      for (const a of (answerData || [])) {
        const name = a.players?.name
        if (!seen.has(name)) {
          seen.add(name)
          unique.push(a)
        }
      }
      setAnswers(unique)
      setMaxStrikes(puzzleData.max_strikes || 9)
    }
    load()
  }, [])

  async function handleSearch(val) {
    setGuess(val)
    if (val.length < 2) { setSuggestions([]); return }
    const { data } = await supabase
      .from('players')
      .select('id, name')
      .ilike('name', `%${val}%`)
      .limit(8)
    setSuggestions(data || [])
  }

  function showMessage(text, type) {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 2500)
  }

  function submitGuess(name) {
    setGuess('')
    setSuggestions([])
    if (gameOver) return

    const match = answers.find(a => a.players?.name?.toLowerCase() === name.toLowerCase())
    if (!match) {
      const newStrikes = strikes + 1
      setStrikes(newStrikes)
      showMessage(`❌ ${name} is not an answer`, 'error')
      if (newStrikes >= maxStrikes) {
        setGameOver(true)
        setGaveUp(true)
      }
      return
    }
    if (found.find(f => f.id === match.id)) {
      showMessage(`Already found ${name}!`, 'info')
      return
    }
    const newFound = [...found, match]
    setFound(newFound)
    showMessage(`✓ ${match.players.name} — ${match.ppg} PPG`, 'success')
    if (newFound.length === answers.length) setGameOver(true)
  }

  function handleGiveUp() {
    setGameOver(true)
    setGaveUp(true)
  }

  if (!puzzle) return (
    <div style={{padding:'2rem', fontFamily:'sans-serif', color:'var(--color-text-primary)'}}>
      No puzzle for today yet!
    </div>
  )

  const pct = answers.length ? Math.round(found.length / answers.length * 100) : 0

  return (
    <div style={{maxWidth:600, margin:'0 auto', padding:'1rem', fontFamily:'sans-serif'}}>
      
      <div style={{background:'#1a2744', borderRadius:12, padding:'1rem', color:'white', marginBottom:'1rem'}}>
        <div style={{display:'flex', gap:'1rem', alignItems:'flex-start'}}>
          <div style={{background:'#e85d04', borderRadius:8, padding:'8px 12px', fontSize:13, flexShrink:0, textAlign:'center', lineHeight:1.4}}>
            🏀<br/>DAILY<br/>GRID
          </div>
          <p style={{fontSize:15, lineHeight:1.6, borderLeft:'3px solid #e85d04', paddingLeft:12, margin:0}}>
            {puzzle.prompt}
          </p>
        </div>
        <div style={{display:'flex', gap:'1rem', marginTop:'1rem', alignItems:'center', flexWrap:'wrap'}}>
          <span style={{color:'#e85d04', fontSize:20, fontWeight:500}}>{found.length}</span>
          <span style={{color:'rgba(255,255,255,0.5)'}}>/ {answers.length}</span>
          <div style={{display:'flex', gap:4}}>
            {Array.from({length: maxStrikes}).map((_,i) => (
              <div key={i} style={{width:14, height:14, borderRadius:'50%', background: i < strikes ? 'rgba(255,255,255,0.15)' : '#e85d04'}} />
            ))}
          </div>
          {!gameOver && (
            <button onClick={handleGiveUp} style={{marginLeft:'auto', background:'transparent', border:'1px solid rgba(255,100,100,0.5)', color:'rgba(255,100,100,0.8)', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer'}}>
              Give Up
            </button>
          )}
        </div>
      </div>

      {message && (
        <div style={{padding:'8px 12px', borderRadius:8, marginBottom:'0.75rem', fontSize:14,
          background: messageType === 'success' ? '#d4edda' : messageType === 'error' ? '#f8d7da' : '#d1ecf1',
          color: messageType === 'success' ? '#155724' : messageType === 'error' ? '#721c24' : '#0c5460'
        }}>
          {message}
        </div>
      )}

      {!gameOver && (
        <div style={{position:'relative', marginBottom:'1rem'}}>
          <input
            value={guess}
            onChange={e => handleSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitGuess(guess)}
            placeholder="Search for a player..."
            style={{width:'100%', padding:'10px 14px', fontSize:15, borderRadius:8, border:'1px solid #ccc', boxSizing:'border-box'}}
          />
          {suggestions.length > 0 && (
            <div style={{position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #ccc', borderRadius:8, zIndex:10, boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
              {suggestions.map(s => (
                <div key={s.id} onClick={() => submitGuess(s.name)}
                  style={{padding:'8px 14px', cursor:'pointer', borderBottom:'1px solid #eee', fontSize:14}}
                  onMouseEnter={e => e.currentTarget.style.background='#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background='white'}>
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
        {answers.map((a, i) => {
          const isFound = found.find(f => f.id === a.id)
          const isRevealed = isFound || gaveUp
          return (
            <div key={i} style={{
              aspectRatio:'1', borderRadius:8,
              border: isFound ? 'none' : gaveUp ? '1px solid #ffcccc' : '1px solid #ddd',
              background: isFound ? '#1a2744' : gaveUp && !isFound ? '#2a1a1a' : '#f9f9f9',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4
            }}>
              {isRevealed ? (
                <>
                  <div style={{fontSize:20}}>🏀</div>
                  <div style={{fontSize:11, color: isFound ? 'white' : '#ffaaaa', background:'rgba(0,0,0,0.4)', padding:'2px 6px', borderRadius:20}}>{a.ppg} PPG</div>
                  <div style={{fontSize:10, color: isFound ? 'rgba(255,255,255,0.85)' : '#ff8888', textAlign:'center', padding:'0 4px', lineHeight:1.3}}>{a.players?.name}</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:20, opacity:0.25}}>🏀</div>
                  <div style={{fontSize:11, color:'#aaa'}}>{a.ppg} PPG</div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {gameOver && (
        <div style={{textAlign:'center', padding:'2rem 1rem', marginTop:'1rem'}}>
          <h2 style={{fontSize:20, fontWeight:500}}>
            {gaveUp && found.length === 0 ? 'Better luck tomorrow!' :
             found.length === answers.length ? '🏆 Perfect!' :
             `${pct}% — Not bad!`}
          </h2>
          <p style={{color:'#666', fontSize:14}}>Found {found.length} of {answers.length}</p>
          <button onClick={() => {
            const text = `🏀 NBA Daily Grid\nFound ${found.length}/${answers.length} (${pct}%)\n${puzzle.prompt}`
            navigator.clipboard.writeText(text)
            showMessage('Copied to clipboard!', 'info')
          }} style={{padding:'10px 24px', background:'#1a2744', color:'white', border:'none', borderRadius:8, fontSize:14, cursor:'pointer'}}>
            Share result
          </button>
        </div>
      )}
    </div>
  )
}