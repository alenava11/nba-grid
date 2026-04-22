import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [puzzle, setPuzzle] = useState(null)
  const [answers, setAnswers] = useState([])
  const [teams, setTeams] = useState({})
  const [found, setFound] = useState([])
  const [guess, setGuess] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [strikes, setStrikes] = useState(0)
  const [maxStrikes, setMaxStrikes] = useState(9)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  const [overtime, setOvertime] = useState(false)
  const [overtimeFound, setOvertimeFound] = useState([])
  const [showEndScreen, setShowEndScreen] = useState(false)

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
        .order(puzzleData.display_stat || 'ppg', { ascending: false })

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

      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
      const teamsMap = {}
      for (const t of (teamsData || [])) {
        teamsMap[t.abbreviation] = t
      }
      setTeams(teamsMap)
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

    const allFound = overtime ? [...found, ...overtimeFound] : found
    const match = answers.find(a => a.players?.name?.toLowerCase() === name.toLowerCase())

    if (!match) {
      if (!overtime) {
        const newStrikes = strikes + 1
        setStrikes(newStrikes)
        showMessage(`❌ ${name} is not an answer`, 'error')
        if (newStrikes >= maxStrikes) {
          setGameOver(true)
          setShowEndScreen(true)
        }
      } else {
        showMessage(`❌ ${name} is not an answer`, 'error')
      }
      return
    }

    if (allFound.find(f => f.id === match.id)) {
      showMessage(`Already found ${name}!`, 'info')
      return
    }

    if (overtime) {
      const newOT = [...overtimeFound, match]
      setOvertimeFound(newOT)
      showMessage(`✓ ${match.players.name} — overtime`, 'success')
      if (found.length + newOT.length === answers.length) {
        showMessage('🏆 All found in overtime!', 'success')
      }
    } else {
      const newFound = [...found, match]
      setFound(newFound)
      showMessage(`✓ ${match.players.name} — ${match[puzzle.display_stat]} ${puzzle.display_stat.toUpperCase()}`, 'success')
      if (newFound.length === answers.length) {
        setGameOver(true)
        setShowEndScreen(true)
      }
    }
  }

  function handleGiveUp() {
    setGameOver(true)
    setGaveUp(true)
    setShowEndScreen(true)
  }

  function startOvertime() {
    setShowEndScreen(false)
    setOvertime(true)
  }

  if (!puzzle) return (
    <div style={{padding:'2rem', fontFamily:'sans-serif'}}>
      No puzzle for today yet!
    </div>
  )

  const pct = answers.length ? Math.round(found.length / answers.length * 100) : 0
  const allFoundIds = new Set([...found.map(f => f.id), ...overtimeFound.map(f => f.id)])

  if (showEndScreen) {
    return (
      <div style={{maxWidth:600, margin:'0 auto', padding:'1rem', fontFamily:'sans-serif', minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center'}}>
        <div style={{background:'#1a2744', borderRadius:16, padding:'2rem', color:'white', textAlign:'center'}}>
          
          <div style={{fontSize:14, color:'rgba(255,255,255,0.6)', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'1px'}}>
            Your Score
          </div>
          
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'2rem', margin:'1.5rem 0'}}>
            <div>
              <div style={{fontSize:48, fontWeight:500, color:'white'}}>{found.length}</div>
              <div style={{fontSize:16, color:'rgba(255,255,255,0.5)'}}>/ {answers.length}</div>
            </div>
            <div style={{width:80, height:80, borderRadius:'50%', border:'4px solid #e85d04', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <span style={{fontSize:20, fontWeight:500, color:'#e85d04'}}>{pct}%</span>
            </div>
          </div>

          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'2rem'}}>
            <span style={{fontSize:14, color:'rgba(255,255,255,0.5)'}}>Strikes:</span>
            <div style={{display:'flex', gap:4}}>
              {Array.from({length: strikes}).map((_,i) => (
                <div key={i} style={{width:20, height:20, borderRadius:'50%', background:'#e24b4a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12}}>✕</div>
              ))}
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <button onClick={startOvertime} style={{padding:'14px', background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, fontSize:15, cursor:'pointer'}}>
              ⏱ Overtime
            </button>
            <button onClick={() => {
              setShowEndScreen(false)
              setGaveUp(true)
            }} style={{padding:'14px', background:'#e85d04', color:'white', border:'none', borderRadius:10, fontSize:15, cursor:'pointer'}}>
              Reveal Answers
            </button>
            <button onClick={() => {
              const text = `🏀 NBA Daily Grid\nFound ${found.length}/${answers.length} (${pct}%)\n${puzzle.prompt}\n\nPlay at balluptop.vercel.app`
              navigator.clipboard.writeText(text)
              showMessage('Copied to clipboard!', 'info')
            }} style={{padding:'14px', background:'transparent', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, fontSize:15, cursor:'pointer'}}>
              Share Results
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{maxWidth:600, margin:'0 auto', padding:'1rem', fontFamily:'sans-serif'}}>

      <div style={{background:'#1a2744', borderRadius:16, padding:'3rem 2rem', color:'white', textAlign:'center', width:'100%'}}>
        <div style={{display:'flex', gap:'1rem', alignItems:'flex-start'}}>
          <div style={{background:'#e85d04', borderRadius:8, padding:'8px 12px', fontSize:13, flexShrink:0, textAlign:'center', lineHeight:1.4}}>
            🏀<br/>DAILY<br/>GRID
          </div>
          <div style={{borderLeft:'3px solid #e85d04', paddingLeft:12}}>
            <p style={{fontSize:15, lineHeight:1.6, margin:0}}>
              {puzzle.prompt}
            </p>
            {puzzle.hint_text && (
              <p style={{fontSize:12, color:'rgba(255,255,255,0.5)', margin:'4px 0 0 0'}}>
                {puzzle.hint_text}
              </p>
            )}
          </div>
        </div>
        <div style={{display:'flex', gap:'1rem', marginTop:'1rem', alignItems:'center', flexWrap:'wrap'}}>
          <span style={{color:'#e85d04', fontSize:20, fontWeight:500}}>{found.length}</span>
          <span style={{color:'rgba(255,255,255,0.5)'}}>/ {answers.length}</span>
          {overtime && <span style={{fontSize:12, color:'#e85d04', border:'1px solid #e85d04', borderRadius:20, padding:'2px 8px'}}>OVERTIME</span>}
          <div style={{display:'flex', gap:4}}>
            {Array.from({length: maxStrikes}).map((_,i) => (
              <div key={i} style={{width:14, height:14, borderRadius:'50%', background: i < strikes ? 'rgba(255,255,255,0.15)' : '#e85d04'}} />
            ))}
          </div>
          {!gameOver && !overtime && (
            <button onClick={handleGiveUp} style={{marginLeft:'auto', background:'transparent', border:'1px solid rgba(255,100,100,0.5)', color:'rgba(255,100,100,0.8)', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer'}}>
              Give Up
            </button>
          )}
          {overtime && (
            <button onClick={() => setShowEndScreen(true)} style={{marginLeft:'auto', background:'transparent', border:'1px solid rgba(255,255,255,0.3)', color:'rgba(255,255,255,0.6)', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer'}}>
              End Overtime
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

      <div style={{position:'relative', marginBottom:'1rem'}}>
        <input
          value={guess}
          onChange={e => handleSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitGuess(guess)}
          placeholder={overtime ? 'Overtime — unlimited guesses...' : 'Search for a player...'}
          style={{width:'100%', padding:'10px 14px', fontSize:15, borderRadius:8, border: overtime ? '1px solid #e85d04' : '1px solid #ccc', boxSizing:'border-box'}}
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

      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
        {answers.map((a, i) => {
          const isFound = found.find(f => f.id === a.id)
          const isOTFound = overtimeFound.find(f => f.id === a.id)
          const isRevealed = isFound || isOTFound || gaveUp
          const teamInfo = teams[a.team]
          return (
            <div key={i} style={{
              aspectRatio:'1', borderRadius:8,
              border: isFound ? 'none' : isOTFound ? '1px solid #e85d04' : gaveUp ? '1px solid #ffcccc' : '1px solid #ddd',
              background: isFound ? '#1a2744' : isOTFound ? '#2a1a0a' : gaveUp && !isFound && !isOTFound ? '#2a1a1a' : '#f9f9f9',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4
            }}>
              {isRevealed ? (
                <>
                  <div style={{fontSize:20}}>🏀</div>
                  <div style={{fontSize:11, color: isFound ? 'white' : isOTFound ? '#e85d04' : '#ffaaaa', background:'rgba(0,0,0,0.4)', padding:'2px 6px', borderRadius:20, textAlign:'center'}}>
                    {a[puzzle.display_stat]} {puzzle.display_stat.toUpperCase()}
                    {puzzle.secondary_stat && ` · ${a[puzzle.secondary_stat]} ${puzzle.secondary_stat.toUpperCase()}`}
                  </div>
                  <div style={{fontSize:10, color: isFound ? 'rgba(255,255,255,0.85)' : isOTFound ? '#e85d04' : '#ff8888', textAlign:'center', padding:'0 4px', lineHeight:1.3}}>
                    {a.players?.name}
                  </div>
                  <div style={{fontSize:10, color: isFound ? 'rgba(255,255,255,0.5)' : '#ff6666', textAlign:'center'}}>
                    {a.season}
                  </div>
                  {puzzle.show_team_hint && teamInfo && (
                    <div style={{fontSize:10, color: isFound ? 'rgba(255,255,255,0.4)' : '#ff4444', textAlign:'center', padding:'0 4px'}}>
                      {teamInfo.full_name}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{fontSize:20, opacity:0.25}}>🏀</div>
                  <div style={{fontSize:11, color:'#aaa', textAlign:'center'}}>
                    {a[puzzle?.display_stat]} {puzzle?.display_stat?.toUpperCase()}
                    {puzzle?.secondary_stat && ` · ${a[puzzle?.secondary_stat]} ${puzzle?.secondary_stat?.toUpperCase()}`}
                  </div>
                  <div style={{fontSize:10, color:'#bbb', textAlign:'center'}}>
                    {a.season}
                    {puzzle?.show_team_hint && teamInfo && ` · ${teamInfo.division}`}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}