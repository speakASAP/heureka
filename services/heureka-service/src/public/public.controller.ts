import { Controller, Get, Header } from '@nestjs/common';

type PublicPage = 'landing' | 'login' | 'register' | 'callback' | 'dashboard';

@Controller()
export class PublicController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  landing() {
    return this.renderPage('landing', 'Alfares Heureka | Automatizace prodeje na Heurece', this.landingBody());
  }

  @Get('login')
  @Header('Content-Type', 'text/html; charset=utf-8')
  login() {
    return this.renderPage('login', 'Přihlášení | Alfares Heureka', this.authRedirectBody('login'));
  }

  @Get('register')
  @Header('Content-Type', 'text/html; charset=utf-8')
  register() {
    return this.renderPage('register', 'Registrace | Alfares Heureka', this.authRedirectBody('register'));
  }

  @Get('auth/callback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  authCallback() {
    return this.renderPage('callback', 'Dokončení přihlášení | Alfares Heureka', this.authCallbackBody());
  }

  @Get('dashboard')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboard() {
    return this.renderPage('dashboard', 'Pracovní prostor | Alfares Heureka', this.dashboardBody());
  }

  private renderPage(page: PublicPage, title: string, body: string) {
    return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="Alfares Heureka automatizuje publikaci katalogových produktů, ceny, sklad a feed pro Heureka.cz s menším rizikem ručních chyb.">
    <style>${this.styles()}</style>
  </head>
  <body data-page="${page}">
    ${body}
    <script>${this.authScript(page)}</script>
  </body>
</html>`;
  }

  private landingBody() {
    return `<header class="site-header">
  <a class="brand" href="/" aria-label="Alfares Heureka">
    <span class="brand-mark">H</span>
    <span>Alfares Heureka</span>
  </a>
  <nav class="nav" aria-label="Hlavní navigace">
    <a href="#automation">Automatizace</a>
    <a href="#control">Kontrola</a>
    <a href="#registration">Registrace</a>
  </nav>
  <div class="header-actions">
    <a class="link-button" href="/login">Přihlásit se</a>
    <a class="primary-button compact" href="/register">Registrovat přes Alfares</a>
  </div>
</header>

<main>
  <section class="hero">
    <div class="hero-copy">
      <h1>Automatizujte prodej na Heurece bez ručních chyb</h1>
      <p class="hero-lead">Alfares Heureka publikuje katalogové produkty na Heureka.cz a drží ceny, sklad, feed a dostupnost v rychlé automatické synchronizaci. Tým má plnou kontrolu nad tím, co se posílá ven, a výrazně méně prostoru pro lidské omyly.</p>
      <div class="hero-actions">
        <a class="primary-button" href="/register">Registrovat přes Alfares</a>
        <a class="secondary-button" href="/login">Přihlásit se</a>
      </div>
    </div>
    <div class="hero-visual" aria-label="Náhled automatizace Alfares Heureka">
      <div class="flow-panel">
        <div class="panel-top">
          <span>Catalog</span>
          <span class="sync-state">Live sync</span>
          <span>Heureka</span>
        </div>
        <div class="pipeline">
          <div class="source-node">
            <strong>Katalog Alfares</strong>
            <span>produkty, ceny, sklad</span>
          </div>
          <div class="pulse-line" aria-hidden="true"></div>
          <div class="source-node red">
            <strong>Heureka feed</strong>
            <span>nabídky bez ručního přepisu</span>
          </div>
        </div>
        <div class="offer-list">
          <div class="offer-row">
            <span class="status ok"></span>
            <span class="offer-name">Aku vrtačka STX-18</span>
            <span>sklad 42</span>
            <strong>3 490 Kč</strong>
          </div>
          <div class="offer-row">
            <span class="status ok"></span>
            <span class="offer-name">Brusný kotouč 125 mm</span>
            <span>sklad 186</span>
            <strong>89 Kč</strong>
          </div>
          <div class="offer-row">
            <span class="status warn"></span>
            <span class="offer-name">Sada bitů Profi</span>
            <span>čeká validace</span>
            <strong>249 Kč</strong>
          </div>
        </div>
        <div class="update-strip">
          <span>Aktualizace fronty</span>
          <strong>ceny + sklad + dostupnost</strong>
        </div>
      </div>
    </div>
  </section>

  <section id="automation" class="section automation-section">
    <div class="section-heading">
      <h2>Automatizace od katalogu až po nabídku</h2>
      <p>Produkty z centrálního katalogu se připraví pro Heureka feed bez ručního kopírování názvů, cen, skladů nebo parametrů.</p>
    </div>
    <div class="timeline">
      <article>
        <span>01</span>
        <h3>Výběr z katalogu</h3>
        <p>Zdroj je jeden: katalog Alfares. Operátor nevyplňuje produkt znovu a systém pracuje se stejnými daty jako ostatní kanály.</p>
      </article>
      <article>
        <span>02</span>
        <h3>Validace před feedem</h3>
        <p>Služba hlídá povinné položky, cenu, obrázek, kategorii, sklad a bezpečný veřejný obsah před odesláním do feedu.</p>
      </article>
      <article>
        <span>03</span>
        <h3>Rychlé aktualizace</h3>
        <p>Změny cen a dostupnosti se promítnou rychleji, protože aktualizace nabídek běží jako řízená automatizace, ne jako ruční tabulka.</p>
      </article>
      <article>
        <span>04</span>
        <h3>Kontrola výsledku</h3>
        <p>Tým vidí, které produkty jsou aktivní, které čekají na opravu a kde automatizace zastavila rizikovou publikaci.</p>
      </article>
    </div>
  </section>

  <section id="control" class="section control-section">
    <div class="control-copy">
      <h2>Plný provozní dohled bez zpomalení práce</h2>
      <p>Automatizace zrychluje rutinu, ale neztrácí kontrolu. Alfares Heureka odděluje připravené nabídky, varování a blokery, aby se chyby neopakovaly ručně na každém produktu.</p>
      <ul class="check-list">
        <li>Automatická synchronizace ceny, skladu a dostupnosti.</li>
        <li>Méně lidských chyb při přepisování produktových dat.</li>
        <li>Rychlejší obnova nabídek po změně katalogu.</li>
        <li>Jednotná registrace a přístup přes Alfares Auth.</li>
      </ul>
    </div>
    <div class="control-board" aria-label="Kontrolní panel Heureka automatizace">
      <div class="board-header">
        <strong>Heureka operations</strong>
        <span>feed readiness</span>
      </div>
      <div class="metric-grid">
        <div><span>Připraveno</span><strong>128</strong></div>
        <div><span>Aktualizováno</span><strong>4 min</strong></div>
        <div><span>Chyby přepisu</span><strong>nižší</strong></div>
      </div>
      <div class="queue">
        <div><span class="status ok"></span><p>Stock sync dokončen</p><strong>OK</strong></div>
        <div><span class="status ok"></span><p>Ceny přepočteny</p><strong>OK</strong></div>
        <div><span class="status warn"></span><p>1 produkt čeká na obrázek</p><strong>kontrola</strong></div>
      </div>
    </div>
  </section>

  <section class="section benefits-section">
    <div class="benefit">
      <h3>Méně ruční práce</h3>
      <p>Data proudí z katalogu, takže tým neopakuje stejnou úpravu v několika systémech.</p>
    </div>
    <div class="benefit">
      <h3>Méně lidských chyb</h3>
      <p>Validace zastaví chybějící cenu, sklad nebo veřejný text dřív, než se dostane do Heureka feedu.</p>
    </div>
    <div class="benefit">
      <h3>Vyšší rychlost změn</h3>
      <p>Aktualizace nabídek běží jako automatizovaný proces a reaguje rychleji než ruční exporty.</p>
    </div>
  </section>

  <section id="registration" class="section registration-section">
    <div>
      <h2>Registrace běží přes společnou Alfares platformu</h2>
      <p>Klienti se registrují a přihlašují přes stejné hosted Auth rozhraní jako ostatní Alfares služby. Heureka nepoužívá lokální formulář ani oddělené heslo.</p>
    </div>
    <div class="registration-actions">
      <a class="primary-button" href="/register">Registrovat přes Alfares</a>
      <a class="secondary-button light" href="/login">Přihlásit se</a>
    </div>
  </section>
</main>

<footer class="footer">
  <span>Alfares Heureka</span>
  <span>Automatizovaný sales channel pro produkty z katalogu Alfares.</span>
</footer>`;
  }

  private authRedirectBody(mode: 'login' | 'register') {
    const title = mode === 'register' ? 'Přesměrování do registrace Alfares' : 'Přesměrování do přihlášení Alfares';
    const action = mode === 'register' ? 'Registrovat přes Alfares' : 'Přihlásit se';
    return `<main class="auth-screen">
  <section class="auth-card">
    <a class="brand auth-brand" href="/" aria-label="Alfares Heureka">
      <span class="brand-mark">H</span>
      <span>Alfares Heureka</span>
    </a>
    <h1>${title}</h1>
    <p>Pro přístup používáme společnou Alfares Auth platformu.</p>
    <button class="primary-button button-reset" type="button" data-auth-start="${mode}">${action}</button>
    <a class="secondary-button light" href="/">Zpět na úvod</a>
  </section>
</main>`;
  }

  private authCallbackBody() {
    return `<main class="auth-screen">
  <section class="auth-card">
    <a class="brand auth-brand" href="/" aria-label="Alfares Heureka">
      <span class="brand-mark">H</span>
      <span>Alfares Heureka</span>
    </a>
    <h1>Dokončujeme přístup</h1>
    <p id="callback-status">Ověřujeme odpověď z Alfares Auth.</p>
    <div class="callback-actions" id="callback-actions" hidden>
      <a class="primary-button" href="/login">Přihlásit se znovu</a>
      <a class="secondary-button light" href="/">Zpět na úvod</a>
    </div>
  </section>
</main>`;
  }

  private dashboardBody() {
    return `<header class="site-header compact-header">
  <a class="brand" href="/" aria-label="Alfares Heureka">
    <span class="brand-mark">H</span>
    <span>Alfares Heureka</span>
  </a>
  <button class="secondary-button light button-reset" type="button" id="logout-button">Odhlásit se</button>
</header>
<main class="dashboard-shell">
  <section class="dashboard-hero">
    <h1>Heureka sales channel</h1>
    <p>Pracovní prostor pro automatizované publikování katalogových produktů na Heureku.</p>
  </section>
  <section class="dashboard-grid">
    <article>
      <span>Feed</span>
      <strong>Automatická příprava</strong>
      <p>Produkty, ceny a sklad se berou z katalogu Alfares.</p>
    </article>
    <article>
      <span>Kontrola</span>
      <strong>Validace před publikací</strong>
      <p>Systém hlídá chybějící data a blokuje rizikové nabídky.</p>
    </article>
    <article>
      <span>Rychlost</span>
      <strong>Krátká aktualizační fronta</strong>
      <p>Změny nabídek se připravují bez ručního exportu.</p>
    </article>
  </section>
</main>`;
  }

  private authScript(page: PublicPage) {
    return `(function () {
  var AUTH_WEB_BASE_URL = 'https://auth.alfares.cz';
  var AUTH_CLIENT_ID = 'heureka-service';
  var AUTH_CALLBACK_PATH = '/auth/callback';
  var STATE_KEY = 'heurekaHostedAuthState';
  var RETURN_KEY = 'heurekaHostedAuthReturnTo';
  var FALLBACK_RETURN = '/dashboard';

  function safeReturnTo(value) {
    if (!value || typeof value !== 'string') return FALLBACK_RETURN;
    if (value.charAt(0) !== '/' || value.indexOf('//') === 0) return FALLBACK_RETURN;
    var clean = value.split('#')[0];
    if (clean === '/login' || clean === '/register' || clean === '/auth/callback') return FALLBACK_RETURN;
    if (clean.indexOf('/login?') === 0 || clean.indexOf('/register?') === 0 || clean.indexOf('/auth/callback?') === 0) return FALLBACK_RETURN;
    return value;
  }

  function randomState() {
    var bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
      return Array.prototype.map.call(bytes, function (byte) {
        return byte.toString(16).padStart(2, '0');
      }).join('');
    }
    return String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function startHostedAuth(mode) {
    var params = new URLSearchParams(window.location.search);
    var returnTo = safeReturnTo(params.get('return_to') || FALLBACK_RETURN);
    var state = randomState();
    window.localStorage.setItem(STATE_KEY, state);
    window.localStorage.setItem(RETURN_KEY, returnTo);
    var authUrl = new URL('/' + mode, AUTH_WEB_BASE_URL);
    authUrl.searchParams.set('client_id', AUTH_CLIENT_ID);
    authUrl.searchParams.set('return_url', window.location.origin + AUTH_CALLBACK_PATH);
    authUrl.searchParams.set('state', state);
    window.location.replace(authUrl.toString());
  }

  function parseJwtUser(token) {
    try {
      var payload = token.split('.')[1];
      if (!payload) return null;
      var normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      var json = decodeURIComponent(Array.prototype.map.call(window.atob(normalized), function (char) {
        return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch (error) {
      return null;
    }
  }

  function handleCallback() {
    var status = document.getElementById('callback-status');
    var actions = document.getElementById('callback-actions');
    var hash = window.location.hash ? window.location.hash.slice(1) : '';
    var params = new URLSearchParams(hash);
    var accessToken = params.get('access_token');
    var refreshToken = params.get('refresh_token');
    var returnedState = params.get('state');
    var expectedState = window.localStorage.getItem(STATE_KEY);
    if (!accessToken) {
      if (status) status.textContent = 'Přihlášení nebylo dokončeno. Token z Alfares Auth chybí.';
      if (actions) actions.hidden = false;
      return;
    }
    if (!expectedState || returnedState !== expectedState) {
      window.localStorage.removeItem(STATE_KEY);
      if (status) status.textContent = 'Bezpečnostní stav přihlášení nesouhlasí. Spusťte přihlášení znovu.';
      if (actions) actions.hidden = false;
      return;
    }
    window.localStorage.setItem('accessToken', accessToken);
    if (refreshToken) window.localStorage.setItem('refreshToken', refreshToken);
    window.localStorage.setItem('heurekaAuthSession', JSON.stringify({
      user: parseJwtUser(accessToken),
      authMethod: params.get('auth_method') || 'hosted',
      expiresAt: params.get('expires_at') || null,
      signedInAt: new Date().toISOString()
    }));
    window.localStorage.removeItem(STATE_KEY);
    var returnTo = safeReturnTo(window.localStorage.getItem(RETURN_KEY) || FALLBACK_RETURN);
    window.localStorage.removeItem(RETURN_KEY);
    window.history.replaceState(null, document.title, AUTH_CALLBACK_PATH);
    window.location.replace(returnTo);
  }

  function protectDashboard() {
    if (!window.localStorage.getItem('accessToken')) {
      window.location.replace('/login?return_to=/dashboard');
      return;
    }
    var button = document.getElementById('logout-button');
    if (button) {
      button.addEventListener('click', function () {
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('refreshToken');
        window.localStorage.removeItem('heurekaAuthSession');
        window.location.replace('/');
      });
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-auth-start]'), function (button) {
    button.addEventListener('click', function () {
      startHostedAuth(button.getAttribute('data-auth-start') || 'login');
    });
  });

  if (${JSON.stringify(page)} === 'login') startHostedAuth('login');
  if (${JSON.stringify(page)} === 'register') startHostedAuth('register');
  if (${JSON.stringify(page)} === 'callback') handleCallback();
  if (${JSON.stringify(page)} === 'dashboard') protectDashboard();
})();`;
  }

  private styles() {
    return `:root {
  --bg: #ffffff;
  --paper: #f6f8fb;
  --ink: #111827;
  --muted: #5f6b7a;
  --line: #dce3ec;
  --graphite: #151923;
  --graphite-soft: #222838;
  --red: #e03131;
  --red-dark: #c22525;
  --green: #16a34a;
  --amber: #f59f00;
  --shadow: 0 24px 80px rgba(15, 23, 42, 0.14);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); letter-spacing: 0; }
a { color: inherit; text-decoration: none; }
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 72px;
  padding: 16px clamp(20px, 5vw, 72px);
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(12px);
}
.compact-header { position: static; }
.brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 800; font-size: 18px; }
.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--red);
  color: #fff;
  font-weight: 900;
}
.nav { display: flex; gap: 28px; color: var(--muted); font-size: 14px; font-weight: 700; }
.nav a:hover { color: var(--ink); }
.header-actions, .hero-actions, .registration-actions, .callback-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.primary-button, .secondary-button, .link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border-radius: 8px;
  padding: 0 20px;
  font-weight: 800;
  font-size: 15px;
  line-height: 1;
  border: 1px solid transparent;
  cursor: pointer;
}
.primary-button { background: var(--red); color: #fff; box-shadow: 0 12px 30px rgba(224, 49, 49, 0.22); }
.primary-button:hover { background: var(--red-dark); }
.secondary-button { color: var(--ink); background: #fff; border-color: var(--line); }
.secondary-button:hover { border-color: #b9c3d1; }
.secondary-button.light { background: transparent; color: var(--ink); border-color: var(--line); }
.link-button { min-height: auto; padding: 0; color: var(--muted); background: transparent; }
.compact { min-height: 42px; padding: 0 16px; font-size: 14px; }
.button-reset { font-family: inherit; }
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.85fr);
  gap: clamp(36px, 6vw, 80px);
  align-items: center;
  padding: clamp(54px, 8vw, 104px) clamp(20px, 5vw, 72px) 56px;
  background:
    linear-gradient(180deg, #ffffff 0%, #ffffff 62%, var(--paper) 62%, var(--paper) 100%);
}
.hero-copy { max-width: 760px; }
h1, h2, h3, p { margin-top: 0; }
h1 { margin-bottom: 24px; font-size: clamp(44px, 7vw, 86px); line-height: 0.95; letter-spacing: 0; }
h2 { margin-bottom: 18px; font-size: clamp(31px, 4vw, 52px); line-height: 1.04; letter-spacing: 0; }
h3 { margin-bottom: 12px; font-size: 21px; line-height: 1.2; letter-spacing: 0; }
.hero-lead, .section-heading p, .control-copy p, .registration-section p, .dashboard-hero p {
  color: var(--muted);
  font-size: clamp(18px, 2vw, 21px);
  line-height: 1.7;
}
.hero-actions { margin-top: 34px; }
.hero-visual { min-width: 0; }
.flow-panel {
  border-radius: 8px;
  padding: 22px;
  background: var(--graphite);
  color: #fff;
  box-shadow: var(--shadow);
}
.panel-top, .update-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 800;
}
.sync-state { color: #bbf7d0; }
.pipeline {
  display: grid;
  grid-template-columns: 1fr 72px 1fr;
  align-items: center;
  gap: 12px;
  margin: 28px 0;
}
.source-node {
  min-height: 128px;
  border-radius: 8px;
  padding: 18px;
  background: var(--graphite-soft);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.source-node.red { background: #31181b; border-color: rgba(224, 49, 49, 0.35); }
.source-node strong, .source-node span { display: block; }
.source-node span { margin-top: 10px; color: #cbd5e1; line-height: 1.5; }
.pulse-line {
  height: 3px;
  background: linear-gradient(90deg, var(--green), var(--red));
  border-radius: 99px;
}
.offer-list { display: grid; gap: 10px; }
.offer-row, .queue div {
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  min-height: 54px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #e5e7eb;
  font-size: 14px;
}
.offer-name { font-weight: 800; color: #fff; }
.status { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.status.ok { background: var(--green); }
.status.warn { background: var(--amber); }
.update-strip {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.update-strip strong { color: #fff; }
.section { padding: clamp(58px, 8vw, 96px) clamp(20px, 5vw, 72px); }
.section-heading { max-width: 820px; margin-bottom: 36px; }
.automation-section { background: var(--paper); }
.timeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: var(--line);
}
.timeline article, .benefit, .dashboard-grid article {
  background: #fff;
  padding: 28px;
}
.timeline span {
  display: inline-block;
  margin-bottom: 42px;
  color: var(--red);
  font-weight: 900;
}
.timeline p, .benefit p, .dashboard-grid p { color: var(--muted); line-height: 1.65; margin-bottom: 0; }
.control-section {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1fr);
  gap: clamp(34px, 6vw, 72px);
  align-items: center;
}
.check-list { display: grid; gap: 14px; margin: 28px 0 0; padding: 0; list-style: none; }
.check-list li {
  position: relative;
  padding-left: 30px;
  color: var(--ink);
  font-weight: 700;
  line-height: 1.5;
}
.check-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: inset 0 0 0 4px #dcfce7;
}
.control-board {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 24px;
  background: #fff;
  box-shadow: var(--shadow);
}
.board-header { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 20px; }
.board-header span { color: var(--muted); font-size: 14px; font-weight: 800; }
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.metric-grid div {
  min-height: 110px;
  padding: 16px;
  border-radius: 8px;
  background: var(--paper);
}
.metric-grid span { display: block; color: var(--muted); font-size: 13px; font-weight: 800; }
.metric-grid strong { display: block; margin-top: 12px; font-size: 28px; }
.queue { display: grid; gap: 10px; margin-top: 16px; }
.queue div { grid-template-columns: auto 1fr auto; background: var(--graphite); }
.queue p { margin: 0; }
.benefits-section { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--line); padding-top: 1px; padding-bottom: 1px; }
.registration-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 32px;
  align-items: center;
  background: var(--graphite);
  color: #fff;
}
.registration-section p { color: #d1d5db; max-width: 820px; }
.registration-section .secondary-button { color: #fff; border-color: rgba(255, 255, 255, 0.24); }
.footer {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 28px clamp(20px, 5vw, 72px);
  color: var(--muted);
  border-top: 1px solid var(--line);
  font-size: 14px;
}
.footer span:first-child { color: var(--ink); font-weight: 900; }
.auth-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--paper);
}
.auth-card {
  width: min(100%, 520px);
  padding: 38px;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow);
}
.auth-brand { margin-bottom: 34px; }
.auth-card h1 { font-size: clamp(34px, 5vw, 52px); line-height: 1.02; margin-bottom: 18px; }
.auth-card p { color: var(--muted); font-size: 18px; line-height: 1.6; }
.auth-card .primary-button, .auth-card .secondary-button { width: 100%; margin-top: 14px; }
.dashboard-shell { padding: clamp(34px, 6vw, 68px) clamp(20px, 5vw, 72px); background: var(--paper); min-height: calc(100vh - 72px); }
.dashboard-hero { max-width: 820px; margin-bottom: 34px; }
.dashboard-hero h1 { font-size: clamp(40px, 6vw, 70px); margin-bottom: 18px; }
.dashboard-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--line); }
.dashboard-grid span { display: block; margin-bottom: 24px; color: var(--red); font-weight: 900; }
.dashboard-grid strong { display: block; font-size: 24px; line-height: 1.15; margin-bottom: 12px; }
@media (max-width: 980px) {
  .site-header { align-items: flex-start; flex-direction: column; }
  .nav { flex-wrap: wrap; }
  .hero, .control-section, .registration-section { grid-template-columns: 1fr; }
  .timeline, .benefits-section, .dashboard-grid { grid-template-columns: 1fr 1fr; }
  .pipeline { grid-template-columns: 1fr; }
  .pulse-line { width: 3px; height: 46px; justify-self: center; }
}
@media (max-width: 620px) {
  .site-header { position: static; gap: 16px; }
  .header-actions, .hero-actions, .registration-actions { width: 100%; }
  .primary-button, .secondary-button { width: 100%; }
  .nav { display: none; }
  .hero { padding-top: 36px; }
  h1 { font-size: 42px; }
  .flow-panel, .control-board, .auth-card { padding: 18px; }
  .timeline, .benefits-section, .metric-grid, .dashboard-grid { grid-template-columns: 1fr; }
  .offer-row { grid-template-columns: auto minmax(0, 1fr); }
  .offer-row span:not(.status), .offer-row strong { grid-column: 2; }
  .footer { flex-direction: column; }
}`;
  }
}
