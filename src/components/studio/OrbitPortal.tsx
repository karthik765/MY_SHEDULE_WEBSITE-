export default function OrbitPortal() {
  return <div className="orbit-portal" aria-hidden="true">
    <div className="portal-coordinate coordinate-top">28° 36′ N / 77° 12′ E</div>
    <div className="portal-halo" />
    <div className="orbital-track track-one"><span /></div>
    <div className="orbital-track track-two"><span /></div>
    <div className="orbital-track track-three" />
    <div className="portal-core"><div className="portal-rim" /><div className="portal-surface" /><div className="portal-horizon" /></div>
    <div className="portal-satellite satellite-one" /><div className="portal-satellite satellite-two" />
    <span className="portal-cross cross-one">+</span><span className="portal-cross cross-two">+</span>
    <div className="portal-coordinate coordinate-bottom"><span />YOUR POTENTIAL IS UNLIMITED</div>
  </div>;
}
