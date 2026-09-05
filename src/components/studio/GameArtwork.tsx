export default function GameArtwork({ id, kind }: { id: string; kind: string }) {
  const snake = /snake|chain|maze/.test(id);
  const chess = /chess/.test(id);
  const grid = /sudoku|2048|tic-tac|pattern|memory|grid/.test(id);
  const numbers = /math|24|number|sum|digit|count/.test(id);
  const physics = kind === "qmaster" || /draw|balance|ball|gravity/.test(id);
  return <svg viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M10 100H150M25 110H135" opacity=".2" />
    {snake ? <><path d="M27 91H100Q133 91 133 65V48Q133 24 110 24H76Q51 24 51 48V62Q51 73 68 73H91" strokeWidth="12" strokeLinecap="round" opacity=".22" /><path d="M27 86H100Q128 86 128 61V43Q128 19 105 19H71Q46 19 46 43V57Q46 68 63 68H91" strokeWidth="6" strokeLinecap="round" /><circle cx="95" cy="68" r="9" fill="currentColor" /><circle cx="98" cy="65" r="1" stroke="var(--paper)" /></> : chess ? <><path d="M47 95H115L110 85H52ZM58 80H106L97 68V51L109 46L103 29L78 12L61 25L74 30L53 50L72 54L63 68Z" fill="currentColor" fillOpacity=".14" /><path d="M74 30L85 43L78 63M81 22L85 24" /><path d="M47 100H115" opacity=".4" /></> : grid ? <>{Array.from({ length: 9 }, (_, i) => <rect key={i} x={30 + i % 3 * 35} y={8 + Math.floor(i / 3) * 30} width="28" height="24" rx="2" fill="currentColor" fillOpacity={i === 4 || i === 8 ? .65 : .07} transform="skewY(-6)" />)}</> : numbers ? <><path d="M30 25L80 9L132 25V84L80 103L30 84Z" fill="currentColor" fillOpacity=".08" /><path d="M30 25L80 43L132 25M80 43V103" opacity=".5" /><text x="45" y="72" fontSize="32" stroke="none" fill="currentColor" fontFamily="monospace">24</text></> : physics ? <><path d="M15 88Q45 20 83 65T147 38" strokeWidth="5" /><circle cx="55" cy="32" r="15" fill="currentColor" fillOpacity=".2" /><path d="M55 7V-2M39 16L33 10M72 15L78 9" opacity=".5" /><circle cx="115" cy="86" r="8" /></> : <><path d="M80 7L130 34V84L80 111L30 84V34Z" fill="currentColor" fillOpacity=".08" /><path d="M80 7V60M30 34L80 60L130 34M80 60V111M30 84L80 60L130 84" opacity=".45" /><circle cx="80" cy="60" r="25" /><path d="M75 48L92 60L75 72Z" fill="currentColor" /></>}
  </svg>;
}
