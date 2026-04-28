import EmailLogin from "./EmailLogin";
import Ranking from "./Ranking";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-mobile-shell">
        <div className="phone-frame">
          <div className="phone-notch" />

          <div className="phone-screen">
            <header className="phone-header">
              <div className="phone-status">
                <span>9:41</span>
                <span>📶 🔋</span>
              </div>

              <div className="phone-brand">
                <img src="/worldcup2026-logo.png" alt="Logo Copa 2026" className="phone-brand-logo" />
                <div>
                  <span className="panel-kicker">Bolao da Copa</span>
                  <h1>World Cup 2026 ⚽</h1>
                </div>
              </div>
            </header>

            <section className="phone-banner">
              <div className="phone-banner-copy">
                <span className="phone-chip">🔥 Live ranking</span>
                <strong>Login rapido, palpites por fase e ranking sempre visivel no celular.</strong>
              </div>

              <img src="/logo1.png" alt="Arte do bolao" className="phone-banner-art" />
            </section>

            <div className="landing-stack">
              <EmailLogin />

              <section className="ranking-panel">
                <div className="ranking-panel-header">
                  <div>
                    <span className="panel-kicker">Ranking atual</span>
                    <h2>Apostadores do bolao 🏆</h2>
                  </div>
                  <span className="panel-pill">Ao vivo</span>
                </div>

                <Ranking limit={10} />
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
