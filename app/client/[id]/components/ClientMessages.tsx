'use client'
import { useRef, useEffect, useState } from 'react'
import { MessageCircle, Send, CheckCheck, ImageIcon, X } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '@/lib/design-tokens'
import { useMessageImageUpload } from '@/app/hooks/useMessageImageUpload'
import MessageImage from '@/app/components/MessageImage'

interface ClientMessagesProps {
  coachMessages: any[]
  coachMsgInput: string
  setCoachMsgInput: (val: string) => void
  sendCoachMessage: (imageUrl?: string | null) => void
  coachId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
}

function smartTime(iso: string): string {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'A l\'instant'
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now); y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ClientMessages({ coachMessages, coachMsgInput, setCoachMsgInput, sendCoachMessage, coachId, supabase }: ClientMessagesProps) {
  const coachMsgEndRef = useRef<HTMLDivElement>(null)
  const coachMsgPrevLen = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { uploadImage, uploading } = useMessageImageUpload(supabase)

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)) }; e.target.value = '' }
  const clearFile = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setSelectedFile(null); setPreviewUrl(null) }
  const handleSend = async () => {
    if (uploading) return
    let imageUrl: string | null = null
    if (selectedFile) { imageUrl = await uploadImage(selectedFile); clearFile() }
    if (!coachMsgInput.trim() && !imageUrl) return
    sendCoachMessage(imageUrl)
  }

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
      <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'12px 16px',display:'flex',flexDirection:'column',gap:4}}>
        {coachMessages.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <MessageCircle size={32} color={TEXT_MUTED} style={{marginBottom:8}}/>
            <p style={{color:TEXT_MUTED,fontSize:'0.85rem',fontFamily:FONT_BODY,margin:0}}>Commencez la conversation</p>
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
                  <div style={{flex:1,height:1,background:BORDER}}/>
                  <span style={{fontSize:'0.6rem',color:TEXT_MUTED,fontFamily:FONT_ALT,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase'}}>{(() => { const d = new Date(msg.created_at); const today = new Date(); return d.toDateString() === today.toDateString() ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) })()}</span>
                  <div style={{flex:1,height:1,background:BORDER}}/>
                </div>
              )}
              <div style={{display:'flex',justifyContent:isCoach?'flex-end':'flex-start',marginBottom:2}}>
                <div style={{maxWidth:'78%',background:isCoach?GOLD_DIM:BG_CARD_2,color:TEXT_PRIMARY,borderRadius:RADIUS_CARD,padding:msg.image_url?4:'10px 14px',border:`1px solid ${isCoach?GOLD_RULE:BORDER}`,overflow:'hidden'}}>
                  {msg.image_url && <MessageImage supabase={supabase} path={msg.image_url} />}
                  {msg.content && <p style={{margin:0,fontSize:'0.88rem',fontFamily:FONT_BODY,lineHeight:1.45,whiteSpace:'pre-wrap',padding:msg.image_url?'4px 10px 0':0}}>{msg.content}</p>}
                  <div style={{display:'flex',alignItems:'center',justifyContent:isCoach?'flex-end':'flex-start',gap:4,marginTop:3,padding:msg.image_url?'0 10px 4px':0}}>
                    <span style={{fontSize:'0.58rem',fontFamily:FONT_BODY,opacity:0.5}}>{smartTime(msg.created_at)}</span>
                    {isCoach && (msg.read ? <CheckCheck size={12} style={{opacity:0.6}}/> : null)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={coachMsgEndRef}/>
      </div>

      {previewUrl && (
        <div style={{padding:'8px 14px',background:BG_BASE,borderTop:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:8}}>
          <img src={previewUrl} alt="Preview" style={{width:50,height:50,objectFit:'cover',borderRadius:8,border:`1px solid ${BORDER}`}}/>
          <button onClick={clearFile} style={{background:'none',border:'none',cursor:'pointer',color:TEXT_MUTED,padding:4}}><X size={16}/></button>
        </div>
      )}

      <div style={{flexShrink:0,padding:'12px 14px',background:BG_BASE,borderTop:previewUrl?'none':`1px solid ${BORDER}`,display:'flex',gap:8,alignItems:'flex-end'}}>
        <input type="file" accept="image/*" capture="environment" style={{display:'none'}} ref={fileInputRef} onChange={handleFileSelected}/>
        <button onClick={()=>fileInputRef.current?.click()} style={{width:40,height:40,borderRadius:12,background:'transparent',border:`1px solid ${BORDER}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <ImageIcon size={16} color={TEXT_MUTED}/>
        </button>
        <textarea value={coachMsgInput} onChange={e=>setCoachMsgInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}} placeholder="Ecrire un message..." rows={1}
          style={{flex:1,background:BG_BASE,border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'10px 16px',color:TEXT_PRIMARY,fontSize:'0.88rem',fontFamily:FONT_BODY,outline:'none',resize:'none',maxHeight:100,lineHeight:1.4}}/>
        <button onClick={handleSend} disabled={uploading || (!coachMsgInput.trim() && !selectedFile)}
          style={{width:40,height:40,borderRadius:12,background:(coachMsgInput.trim()||selectedFile)?GOLD:'rgba(255,255,255,0.06)',border:'none',cursor:(coachMsgInput.trim()||selectedFile)?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {uploading ? <div style={{width:16,height:16,border:'2px solid #0D0B08',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/> : <Send size={16} color={(coachMsgInput.trim()||selectedFile)?'#0D0B08':TEXT_MUTED}/>}
        </button>
      </div>
    </div>
  )
}
