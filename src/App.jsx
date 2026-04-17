import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [puzzle, setPuzzle] = useState(null)
  const [answers, setAnswers] = useState([])
  const [found, setFound] = useState([])
  const [guess, setGuess] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [lives, setLives] = useState(9)
  const [message, setMessage] = useState('')
  const [gameOver, setGameOver] = useState(false)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
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
      setAnswers(answerData || [])
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

  function submitGuess(name) {
    setGuess('')
    setSuggestions([])
    if (gameOver) return

    const match = answers.find(a => a.players?.name?.toLowerCase() === name.toLowerCase())
    if (!match) {
      const newLives = lives - 1
      setLives(newLives)
      setMessage(`❌ ${name} is not an answer`)
      if (newLives <= 0) setGameOver(true)
      return
    }
    if (found.find(f => f.id === match.id)) {
      setMessage(`Already found ${name}!`)
      return
    }
    setFound(prev => [...prev, match])
    setMessage(`✓ ${match.players.name} — ${match.ppg} PPG`)
    if (found.length + 1 === answers.length) setGameOver(true)
  }

  if (!puzzle) return <div style={{padding:'2rem'}}>No puzzle for today yet!</div>

  return (
    <div style={{maxWidth:600, margin:'0 auto', padding:'1rem', fontFamily:'sans-serif'}}>
      <div style={{background:'#1a2744', borderRadius:12, padding:'1rem', color:'white', marginBottom:'1rem'}}>
        <div style={{display:'flex', gap:'1rem', alignItems:'flex-start'}}>
          <div style={{background:'#e85d04', borderRadius:8, padding:'8px 12px', fontSize:13, flexShrink:0}}>
            🏀<br/>DAILY<br/>GRID
          </div>
          <p style={{fontSize:15, lineHeight:1.6, borderLeft:'3px solid #e85d04', paddingLeft:12}}>
            {puzzle.prompt}
          </p>
        </div>
        <div style={{display:'flex', gap:'1rem', marginTop:'1rem', alignItems:'center'}}>
          <span style={{color:'#e85d04', fontSize:20}}>{found.length}</span>
          <span style={{color:'rgba(255,255,255,0.5)'}}>/ {answers.length}</span>
          <div style={{display:'flex', gap:4}}>
            {Array.from({length:9}).map((_,i) => (
              <div key={i} style={{width:14, height:14, borderRadius:'50%', background: i < (9-lives) ? 'rgba(255,255,255,0.2)' : '#e85d04'}} />
            ))}
          </div>
        </div>
      </div>

      {message && (
        <div style={{padding:'8px 12px', borderRadius:8, marginBottom:'0.75rem', background: message.startsWith('✓') ? '#d4edda' : '#f8d7da', color: message.startsWith('✓') ? '#155724' : '#721c24'}}>
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
            <div style={{position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #ccc', borderRadius:8, zIndex:10}}>
              {suggestions.map(s => (
                <div key={s.id} onClick={() => submitGuess(s.name)}
                  style={{padding:'8px 14px', cursor:'pointer', borderBottom:'1px solid #eee'}}
                  onMouseEnter={e => e.target.style.background='#f5f5f5'}
                  onMouseLeave={e => e.target.style.background='white'}>
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
          return (
            <div key={i} style={{aspectRatio:'1', borderRadius:8, border: isFound ? 'none' : '1px solid #ddd', background: isFound ? '#1a2744' : '#f9f9f9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4}}>
              {isFound ? (
                <>
                  <div style={{fontSize:22}}>🏀</div>
                  <div style={{fontSize:12, color:'white', background:'rgba(0,0,0,0.4)', padding:'2px 8px', borderRadius:20}}>{a.ppg} PPG</div>
                  <div style={{fontSize:11, color:'rgba(255,255,255,0.8)', textAlign:'center', padding:'0 4px'}}>{a.players?.name}</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:22, opacity:0.3}}>🏀</div>
                  <div style={{fontSize:11, color:'#999'}}>{a.ppg} PPG</div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {gameOver && (
        <div style={{textAlign:'center', padding:'2rem', marginTop:'1rem'}}>
          <h2>{found.length === answers.length ? '🏆 Perfect!' : `${Math.round(found.length/answers.length*100)}% complete`}</h2>
          <p style={{color:'#666'}}>Found {found.length} of {answers.length}</p>
        </div>
      )}
    </div>
  )
}