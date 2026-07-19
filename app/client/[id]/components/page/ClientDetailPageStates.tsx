import { BG_BASE, GOLD, GOLD_RULE, RED, RADIUS_CARD, FONT_ALT, FONT_BODY } from '@/lib/design-tokens'

export function ClientDetailLoadingView() {
  return <div style={{minHeight:'100vh',background:BG_BASE,padding:'20px 16px'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><div className="skeleton" style={{width:60,height:60,borderRadius:'50%'}} /><div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}><div className="skeleton" style={{height:16,width:'60%'}} /><div className="skeleton" style={{height:12,width:'40%'}} /></div></div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{height:80,borderRadius:RADIUS_CARD}} />)}</div>
  </div>
}

export function ClientDetailUnavailableView({ message, onBack }: { message: string; onBack: () => void }) {
  return <div style={{minHeight:'100vh',background:BG_BASE,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
    <p style={{color:RED,fontFamily:FONT_BODY,fontSize:'0.9rem'}}>{message}</p>
    <button onClick={onBack} style={{color:GOLD,background:'none',border:`1px solid ${GOLD_RULE}`,borderRadius:0,padding:'8px 18px',cursor:'pointer',fontFamily:FONT_ALT,fontWeight:800}}>← Retour</button>
  </div>
}
