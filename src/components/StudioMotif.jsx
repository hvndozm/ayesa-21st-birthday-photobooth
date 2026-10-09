// Original local artwork for the studio UI. These never enter the PNG renderer.
const starPoints = '0,-10 2.9,-3.1 9.5,-3.1 4.7,1.5 5.9,8.1 0,4.7 -5.9,8.1 -4.7,1.5 -9.5,-3.1 -2.9,-3.1'

function SevenStars() {
  const stars = [[11,26,.8], [29,13,.65], [50,27,1.1], [74,14,.7], [97,27,.95], [118,10,.55], [135,28,.7]]
  return <svg viewBox="0 0 146 42" fill="currentColor">
    {stars.map(([x, y, scale], index) => <polygon key={index} className={`studio-star studio-star--${index % 3}`}
      points={starPoints} transform={`translate(${x} ${y}) scale(${scale})`} />)}
  </svg>
}

function StrawberryGlasses() {
  return <svg viewBox="0 0 164 106" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 39 3 24M149 39l12-15M72 45q10-15 20 0" stroke="#51434b" strokeWidth="4" />
    {[0, 82].map(offset => <g key={offset} transform={`translate(${offset} 0)`}>
      <path d="M20 32C3 36 8 58 19 74l20 23q6 6 12-1l20-25c13-18 10-37-6-40-10-2-15 5-22 5s-13-7-23-4Z"
        fill="#ae3c50" stroke="#392b33" strokeWidth="3" />
      <path d="M23 40C13 47 23 66 42 86M54 43c5-3 10-2 13 1" stroke="#ec9dba" strokeWidth="3" />
      <path d="m43 36-18-11 11-1-3-15 12 13 10-15-2 17 15 1-19 12" fill="#6e7857" stroke="#424934" strokeWidth="2" />
      {[[28,49],[46,48],[62,53],[31,65],[49,66],[43,80]].map(([x,y]) =>
        <path key={`${x}-${y}`} d={`M${x} ${y}l-1 4`} stroke="#ffe7d4" strokeWidth="2.5" />)}
    </g>)}
  </svg>
}

function Lotus() {
  return <svg viewBox="0 0 108 86" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M54 64C34 46 39 22 54 9c15 13 20 37 0 55Z" />
    <path d="M54 65C27 67 15 47 18 26c19 3 32 15 36 39ZM54 65c27 2 39-18 36-39-19 3-32 15-36 39Z" />
    <path d="M54 66C27 79 9 63 5 47c20-2 36 3 49 19ZM54 66c27 13 45-3 49-19-20-2-36 3-49 19Z" />
    <path d="M25 77q29 9 58 0M36 80q18 5 36 0M54 20v40" />
    <circle cx="54" cy="4" r="1.5" fill="currentColor" stroke="none" />
  </svg>
}

function Chain() {
  return <svg viewBox="0 0 228 38" fill="none" stroke="currentColor" strokeWidth="1.7">
    {Array.from({ length: 13 }, (_, index) => <ellipse key={index} cx={12 + index * 17} cy={15 + Math.sin(index * .7) * 6}
      rx="11" ry="5" transform={`rotate(${index % 2 ? -28 : 28} ${12 + index * 17} ${15 + Math.sin(index * .7) * 6})`} />)}
    <path d="M113 27v-5a5 5 0 0 1 10 0v5m-12 0h14v10h-14Z" fill="#fffdf8" strokeLinejoin="round" />
    <path d="M118 30v4" />
  </svg>
}

function SafetyPin() {
  return <svg viewBox="0 0 88 42" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m23 30 52-17c13-4 9-18-3-14L15 18c-18 6-10 23 3 18l5-6Z" transform="translate(0 4)" />
    <path d="m23 34 47-15M72 10l-7 8 8 8 9-6" />
    <circle cx="19" cy="29" r="5" />
  </svg>
}

function Record() {
  return <svg viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="46" fill="#292329" stroke="#9d929e" strokeWidth="2" />
    {[39,32,25].map(radius => <circle key={radius} cx="50" cy="50" r={radius} stroke="#635963" strokeWidth=".8" />)}
    <path d="M17 41A35 35 0 0 1 40 17M60 83a35 35 0 0 0 23-23" stroke="#c6b6c5" strokeWidth="2" />
    <circle cx="50" cy="50" r="17" fill="#c9859b" />
    <polygon points={starPoints} transform="translate(50 50) scale(1.1)" fill="#fff8f1" />
    <circle cx="50" cy="50" r="3" fill="#292329" />
  </svg>
}

export default function StudioMotif({ type, className = '' }) {
  const artwork = {
    'seven-stars': <SevenStars />,
    glasses: <StrawberryGlasses />,
    lotus: <Lotus />,
    chain: <Chain />,
    'safety-pin': <SafetyPin />,
    record: <Record />,
    'room-tag': <><span className="room-tag-hole" /><small>ROOM</small><strong>707</strong><span className="room-tag-rule" /></>,
    ticket: <><span className="ticket-side">AYESA / 21</span><span className="ticket-copy"><small>ONE NIGHT ONLY</small><strong>Birthday<br />session</strong><span>ROOM 707 · ALL LOVE</span></span></>,
  }
  return <span className={`studio-motif studio-motif--${type} ${className}`} aria-hidden="true">
    {artwork[type]}
  </span>
}
