'use client'
import { useRef, useEffect } from 'react'
import { MessageCircle, Send, CheckCheck } from 'lucide-react'

interface ClientMessagesProps {
  coachMessages: any[]
  coachMsgInput: string
  setCoachMsgInput: (val: string) => void
  sendCoachMessage: () => void
  coachId: string | null
}

export default function ClientMessages({ coachMessages, coachMsgInput, setCoachMsgInput, sendCoachMessage, coachId }: ClientMessagesProps) {
  const coachMsgEndRef = useRef<HTMLDivElement>(null)
  const coachMsgPrevLen = useRef(0)

  useEffect(() => {
    if (coachMessages.length === 0) return
    const isInitial = coachMsgPrevLen.current === 0
    coachMsgPrevLen.current = coachMessages.length
    const timer = setTimeout(() => {
      coachMsgEndRef.current?.scrollIntoView({ behavior: isInitial ? 'instant' as ScrollBehavior : 'smooth' })
    }, 0)
    return () => clearTimeout(timer)
  }, [coachMessages.length])

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 120px)'}}>
      {/* Messages scrollable */}
      <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'12px 16px',display:'flex',flexDirection:'column',gap:4}}>
        {coachMessages.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <MessageCircle size={32} color="#6B7280" style={{marginBottom:8}}/>
            <p style={{color:'#6B7280',fontSize:'0.85rem',margin:0}}>Commencez la conversation</p>
          </div>
        )}
        {coachMessages.map((msg: any, i: number) => {
          const isCoach = msg.sender_id === coachId
          const prevMsg = coachMessages[i-1]
          const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
          return (
            <div key={msg.id}>
              {showDate && (
                <div style={{display:'flex',alignItems:'center',gap:10,margin:'12px 0',padding:'0 8px'}}>
                  <div style={{flex:1,height:1,background:'#242424'}}/>
                  <span style={{fontSize:'0.6rem',color:'#6B7280',fontWeight:600}}>{(() => { const d = new Date(msg.created_at); const today = new Date(); return d.toDateString() === today.toDateString() ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) })()}</span>
                  <div style={{flex:1,height:1,background:'#242424'}}/>
                </div>
              )}
              <div style={{display:'flex',justifyContent:isCoach?'flex-end':'flex-start',marginBottom:2}}>
                <div style={{maxWidth:'78%',background:isCoach?'#C9A84C':'#1E1E1E',color:isCoach?'#000':'#F8FAFC',borderRadius:isCoach?'16px 16px 4px 16px':'16px 16px 16px 4px',padding:'10px 14px',border:isCoach?'none':'1px solid #242424'}}>
                  <p style={{margin:0,fontSize:'0.88rem',lineHeight:1.45,whiteSpace:'pre-wrap'}}>{msg.content}</p>
                  <div style={{display:'flex',alignItems:'center',justifyContent:isCoach?'flex-end':'flex-start',gap:4,marginTop:3}}>
                    <span style={{fontSize:'0.58rem',opacity:0.5}}>{new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                    {isCoach && (msg.read ? <CheckCheck size={12} style={{opacity:0.6}}/> : null)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={coachMsgEndRef}/>
      </div>
      {/* Input always at bottom */}
      <div style={{flexShrink:0,padding:'12px 14px',background:'#111111',borderTop:'1px solid #222222',display:'flex',gap:8,alignItems:'flex-end'}}>
        <textarea value={coachMsgInput} onChange={e=>setCoachMsgInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendCoachMessage()}}} placeholder="Écrire un message..." rows={1}
          style={{flex:1,background:'#0A0A0A',border:'1px solid #242424',borderRadius:20,padding:'10px 16px',color:'#F8FAFC',fontSize:'0.88rem',outline:'none',resize:'none',maxHeight:100,lineHeight:1.4,fontFamily:'inherit'}}/>
        <button onClick={sendCoachMessage} disabled={!coachMsgInput.trim()}
          style={{width:40,height:40,borderRadius:'50%',background:coachMsgInput.trim()?'#C9A84C':'#242424',border:'none',cursor:coachMsgInput.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Send size={16} color={coachMsgInput.trim()?'#000':'#6B7280'}/>
        </button>
      </div>
    </div>
  )
}
