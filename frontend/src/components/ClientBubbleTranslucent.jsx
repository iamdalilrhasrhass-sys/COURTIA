import React from 'react';

function abbreviate(fullName) {
  const parts = fullName.split(' ');
  if (parts.length === 1) return parts[0];
  return parts[0].charAt(0) + '. ' + parts[parts.length - 1];
}

const PROSPECT_GRADIENT = `radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.7) 0%, rgba(186,230,253,0.35) 40%, rgba(147,197,253,0.25) 100%)`;
const ACTIF_GRADIENT = `radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.7) 0%, rgba(167,243,208,0.35) 40%, rgba(110,231,183,0.25) 100%)`;
const FILM_OVERLAY = `conic-gradient(from 0deg, rgba(186,230,253,0.15), rgba(196,181,253,0.2), rgba(167,243,208,0.12), rgba(253,186,116,0.18), rgba(236,72,153,0.15), rgba(186,230,253,0.15))`;

const S = {
  wrapper: { display:'flex',flexDirection:'column',alignItems:'center',gap:8,animation:'clientFloat 4.5s ease-in-out infinite' },
  circle: { width:60,height:60,borderRadius:'50%',position:'relative',border:'0.5px solid rgba(255,255,255,0.5)' },
  film: { position:'absolute',inset:0,borderRadius:'50%',background:FILM_OVERLAY,mixBlendMode:'screen',opacity:0.4,pointerEvents:'none' },
  highlight: { position:'absolute',top:'12%',left:'20%',width:'28%',height:'18%',background:'radial-gradient(ellipse, rgba(255,255,255,0.9), transparent)',borderRadius:'50%',filter:'blur(1px)',opacity:0.6,transform:'rotate(-15deg)',pointerEvents:'none' },
  initials: { position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Arial, sans-serif',fontWeight:700,fontSize:13,color:'rgba(0,0,0,0.7)',zIndex:1 },
  name: { fontFamily:'Arial, sans-serif',fontWeight:400,fontSize:11,opacity:0.55 },
  score: { fontFamily:'Arial, sans-serif',fontWeight:700,fontSize:14,opacity:0.85 },
  badge: { fontFamily:'Arial, sans-serif',fontWeight:400,fontSize:9,borderRadius:100,padding:'2px 8px' },
};

export default function ClientBubbleTranslucent({ client }) {
  const { name, initials, score, status } = client;
  const isActif = status === 'Actif';
  const gradientBg = isActif ? ACTIF_GRADIENT : PROSPECT_GRADIENT;
  const badgeBg = isActif ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)';
  const badgeColor = isActif ? 'rgba(16,185,129,0.85)' : 'rgba(59,130,246,0.85)';

  return (
    <>
      <style>{`@keyframes clientFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
      <div style={S.wrapper}>
        <div style={{...S.circle,background:gradientBg}}>
          <div style={S.film} />
          <div style={S.highlight} />
          <span style={S.initials}>{initials}</span>
        </div>
        <div style={S.name}>{abbreviate(name)}</div>
        <div style={S.score}>{score}</div>
        <div style={{...S.badge,background:badgeBg,color:badgeColor}}>{status}</div>
      </div>
    </>
  );
}
