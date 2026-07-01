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
  <div class="header-inner">
    <a class="brand" href="/" aria-label="Alfares Heureka">
      <span class="brand-text">Alfares <strong>Heureka</strong></span>
    </a>
    <nav class="nav" aria-label="Hlavní navigace">
      <a href="#automation">Automatizace</a>
      <a href="#control">Kontrola</a>
      <a href="#registration">Registrace</a>
    </nav>
    <div class="header-actions">
      <a class="primary-button compact" href="/register">Registrovat přes Alfares ${this.icon('external')}</a>
      <a class="secondary-button compact" href="/login">Přihlásit se ${this.icon('arrow-right')}</a>
    </div>
  </div>
</header>

<main>
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-copy">
        <h1>Automatizujte prodej na Heurece bez ručních chyb</h1>
        <p class="hero-lead">Propojte katalog Alfares s Heurekou a mějte jistotu, že vaše offery, ceny i dostupnost jsou vždy aktuální. Plná automatizace, méně chyb a více času na růst.</p>
        <div class="hero-actions">
          <a class="primary-button" href="/register">Registrovat přes Alfares ${this.icon('external')}</a>
          <a class="secondary-button" href="/login">Přihlásit se ${this.icon('arrow-right')}</a>
        </div>
        <p class="auth-note">${this.icon('lock')} Přihlášení a registrace probíhá přes sdílené Alfares Auth.</p>
      </div>

      <div class="dashboard-preview" aria-label="Náhled Alfares Heureka dashboardu">
        <div class="preview-flow">
          <div class="flow-brand"><span class="a-mark">A</span><strong>Alfares katalog</strong></div>
          <div class="flow-sync"><span></span><b>${this.icon('check')}</b><small>Automatická synchronizace</small></div>
          <div class="flow-market">${this.icon('search-check')}<strong>Heureka</strong></div>
        </div>
        <div class="preview-shell">
          <aside class="preview-sidebar">
            <span class="active">${this.icon('gauge')} Přehled</span>
            <span>${this.icon('box')} Produkty</span>
            <span>${this.icon('database')} Feedy</span>
            <span>${this.icon('refresh')} Aktualizace</span>
            <span>${this.icon('check-circle')} Validace</span>
            <span>${this.icon('settings')} Nastavení</span>
          </aside>
          <div class="preview-content">
            <h2>Přehled</h2>
            <div class="stat-grid">
              <div><span>Produkty v katalogu</span><strong>24 851</strong></div>
              <div><span>Publikováno na Heurece</span><strong>23 742 <em>95,5 %</em></strong></div>
              <div><span>Aktualizace dnes</span><strong>7 328 <em>Úspěšné</em></strong></div>
            </div>
            <div class="preview-panels">
              <section class="sync-panel">
                <h3>Stav synchronizace</h3>
                <dl>
                  <div><dt>Ceny</dt><dd>Synchronizováno <span>Před 2 min</span></dd></div>
                  <div><dt>Skladové zásoby</dt><dd>Synchronizováno <span>Před 2 min</span></dd></div>
                  <div><dt>Dostupnost</dt><dd>Synchronizováno <span>Před 3 min</span></dd></div>
                </dl>
              </section>
              <section class="queue-panel">
                <h3>Fronta aktualizací</h3>
                <dl>
                  <div><dt>Čeká na odeslání</dt><dd>156</dd></div>
                  <div><dt>Odesílá se</dt><dd>18</dd></div>
                  <div><dt>Úspěšné</dt><dd>7 328</dd></div>
                  <div><dt>Chyby</dt><dd>12</dd></div>
                </dl>
              </section>
            </div>
            <div class="preview-panels lower">
              <section>
                <h3>Poslední validace feedu</h3>
                <ul class="validation-list">
                  <li><span>Povinné parametry</span><strong>OK</strong></li>
                  <li><span>Ceny a měny</span><strong>OK</strong></li>
                  <li><span>Dostupnost a sklad</span><strong>OK</strong></li>
                  <li><span>Obrázky</span><strong class="warn">Upozornění (3)</strong></li>
                  <li><span>Kategorie a mapping</span><strong>OK</strong></li>
                </ul>
              </section>
              <section>
                <h3>Poslední aktualizace</h3>
                <ul class="update-list">
                  <li><span>Herní židle Alfares Pro</span><em>Před 1 min</em></li>
                  <li><span>Bezdrátová sluchátka X1</span><em>Před 2 min</em></li>
                  <li><span>Monitor 27" QHD</span><em>Před 2 min</em></li>
                  <li><span>Klávesnice Mechanical K7</span><em>Před 3 min</em></li>
                  <li><span>Myš Wireless M6</span><em>Před 3 min</em></li>
                </ul>
                <a href="/dashboard">Zobrazit všechny ${this.icon('arrow-right')}</a>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="automation" class="process-section">
    <div class="section-title centered">
      <h2>Plně automatizovaný proces</h2>
      <p>Od katalogu Alfares k viditelnosti na Heurece bez zásahu operátora.</p>
    </div>
    <div class="process-rail">
      <article>
        <span class="process-icon">${this.icon('database')}</span>
        <h3>1. Katalog Alfares</h3>
        <p>Produkty, ceny, sklad a parametry ze systému Alfares.</p>
      </article>
      <span class="rail-arrow">${this.icon('arrow-right')}</span>
      <article>
        <span class="process-icon red">${this.icon('upload')}</span>
        <h3>2. Zpracování a validace</h3>
        <p>Automatické mapování, kontrola dat a validace podle pravidel Heureky.</p>
      </article>
      <span class="rail-arrow">${this.icon('arrow-right')}</span>
      <article>
        <span class="process-icon red">${this.icon('refresh')}</span>
        <h3>3. Synchronizace</h3>
        <p>Automatické odesílání změn cen, skladů a dostupnosti v reálném čase.</p>
      </article>
      <span class="rail-arrow">${this.icon('arrow-right')}</span>
      <article>
        <span class="process-icon orange">${this.icon('search-check')}</span>
        <h3>4. Heureka</h3>
        <p>Vaše nabídka je vždy aktuální, přesná a konkurenceschopná.</p>
      </article>
    </div>
  </section>

  <section id="control" class="control-section">
    <div class="control-copy">
      <h2>Plná kontrola nad vaší nabídkou</h2>
      <p>Mějte přehled o každé změně, stavech feedů a kvalitě dat na jednom místě. Reagujte rychle a s jistotou.</p>
      <ul class="check-list">
        <li>${this.icon('check-circle')} Přehled o synchronizacích cen, skladů a dostupnosti</li>
        <li>${this.icon('check-circle')} Fronta aktualizací a historie změn</li>
        <li>${this.icon('check-circle')} Validace feedu a upozornění na chyby</li>
        <li>${this.icon('check-circle')} Detailní logy a auditní stopa</li>
        <li>${this.icon('check-circle')} Nastavení pravidel a mapování kategorií</li>
      </ul>
      <a class="secondary-button explore-button" href="/dashboard">Prozkoumat kontrolní panel ${this.icon('arrow-right')}</a>
    </div>
    <div class="products-panel" aria-label="Tabulka produktů Alfares Heureka">
      <div class="table-title">Produkty</div>
      <div class="tabs"><span class="active">Vše</span><span>Publikované</span><span>Nezveřejněné</span><span>Chyby</span></div>
      <div class="filters"><span>${this.icon('search')} Hledat produkt</span><span>Všechny kategorie</span><span>Stav</span><span>${this.icon('filter')} Filtry</span></div>
      <table>
        <thead><tr><th>Produkt</th><th>Stav</th><th>Heureka kód</th><th>Cena</th><th>Sklad</th><th>Poslední aktualizace</th></tr></thead>
        <tbody>
          <tr><td>${this.icon('headphones')} Herní židle Alfares Pro</td><td><b>Publikováno</b></td><td>123456</td><td>5 990 Kč</td><td>12 ks</td><td>Před 1 min</td></tr>
          <tr><td>${this.icon('headphones')} Bezdrátová sluchátka X1</td><td><b>Publikováno</b></td><td>123457</td><td>2 490 Kč</td><td>26 ks</td><td>Před 2 min</td></tr>
          <tr><td>${this.icon('monitor')} Monitor 27" QHD</td><td><b>Publikováno</b></td><td>123458</td><td>6 790 Kč</td><td>8 ks</td><td>Před 2 min</td></tr>
          <tr><td>${this.icon('keyboard')} Klávesnice Mechanical K7</td><td><b class="danger">Chyba</b></td><td>-</td><td>1 800 Kč</td><td>0 ks</td><td>Před 5 min</td></tr>
          <tr><td>${this.icon('mouse')} Myš Wireless M6</td><td><b>Publikováno</b></td><td>123460</td><td>690 Kč</td><td>45 ks</td><td>Před 3 min</td></tr>
        </tbody>
      </table>
      <a href="/dashboard" class="table-link">Zobrazit všechny produkty ${this.icon('arrow-right')}</a>
    </div>
  </section>

  <section class="benefits-section">
    <h2>Rychlejší aktualizace. Méně chyb. Lepší výsledky.</h2>
    <div class="benefit-grid">
      <article>${this.icon('rocket')}<div><h3>Rychlejší uvedení nabídek</h3><p>Nové produkty a změny se na Heurece objeví rychleji díky automatizaci.</p></div></article>
      <article>${this.icon('shield')}<div><h3>Méně lidských chyb</h3><p>Validace a pravidla minimalizují chyby v datech a zamítnutí nabídek.</p></div></article>
      <article>${this.icon('refresh')}<div><h3>Vždy aktuální data</h3><p>Ceny, sklad i dostupnost jsou synchronizované v reálném čase.</p></div></article>
      <article>${this.icon('chart')}<div><h3>Vyšší výkon na Heurece</h3><p>Přesná data zlepšují viditelnost, konverze a spokojenost zákazníků.</p></div></article>
    </div>
  </section>

  <section id="registration" class="auth-section">
    <div class="auth-card-large">
      <div class="auth-copy">
        <h2>Společné přihlášení Alfares Auth</h2>
        <p>Alfares Heureka využívá sdílené přihlášení Alfares Auth. Jeden účet pro všechny služby Alfares.</p>
        <ul class="auth-checks">
          <li>${this.icon('check')} Bezpečné a ověřené přihlášení</li>
          <li>${this.icon('check')} Jednoduchá registrace bez dalšího účtu</li>
          <li>${this.icon('check')} Přístup ke všem službám Alfares</li>
        </ul>
      </div>
      <div class="auth-diagram" aria-label="Alfares Auth propojení">
        <div class="auth-node user"><strong>Alfares</strong><span>Váš účet</span>${this.icon('user')}</div>
        <span class="dash-line"></span>
        <div class="auth-core"><strong>A</strong><span>Alfares Auth</span><em>${this.icon('lock')}</em></div>
        <span class="dash-line"></span>
        <div class="auth-node"><strong>Alfares<br>Heureka</strong><span>Služba</span>${this.icon('search-check')}</div>
      </div>
      <div class="auth-actions">
        <a class="primary-button" href="/register">Registrovat přes Alfares ${this.icon('external')}</a>
        <a class="secondary-button" href="/login">Přihlásit se ${this.icon('arrow-right')}</a>
        <p>${this.icon('lock')} Budete přesměrováni na zabezpečené přihlášení Alfares Auth.</p>
      </div>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="footer-inner">
    <div><h2>Alfares Heureka</h2><p>Automatizovaný prodejní kanál pro publikaci vašeho katalogu na Heurece. Plná kontrola, žádné ruční chyby.</p></div>
    <nav><h3>Produkt</h3><a href="#automation">Automatizace</a><a href="#control">Kontrola</a><a href="#registration">Integrace</a></nav>
    <nav><h3>O službě</h3><a href="#automation">Jak to funguje</a><a href="/login">Bezpečnost</a><a href="/login">Podpora</a></nav>
    <nav><h3>Právní informace</h3><a href="/login">Podmínky služby</a><a href="/login">Ochrana osobních údajů</a></nav>
    <nav><h3>Kontakt</h3><a href="mailto:podpora@alfares.cz">podpora@alfares.cz</a><a href="tel:+420222123456">+420 222 123 456</a></nav>
  </div>
  <div class="footer-bottom"><span>© 2026 Alfares Heureka. Všechna práva vyhrazena.</span><span>heureka.alfares.cz</span></div>
</footer>`;
  }

  private authRedirectBody(mode: 'login' | 'register') {
    const title = mode === 'register' ? 'Přesměrování do registrace Alfares' : 'Přesměrování do přihlášení Alfares';
    const action = mode === 'register' ? 'Registrovat přes Alfares' : 'Přihlásit se';
    return `<main class="auth-screen">
  <section class="auth-card">
    <a class="brand auth-brand" href="/" aria-label="Alfares Heureka">
      <span class="brand-text">Alfares <strong>Heureka</strong></span>
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
      <span class="brand-text">Alfares <strong>Heureka</strong></span>
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
  <div class="header-inner">
    <a class="brand" href="/" aria-label="Alfares Heureka">
      <span class="brand-text">Alfares <strong>Heureka</strong></span>
    </a>
    <button class="secondary-button light button-reset" type="button" id="logout-button">Odhlásit se</button>
  </div>
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

  private icon(name: string) {
    const icons: Record<string, string> = {
      'arrow-right': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
      external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M19 14v5H5V5h5"/></svg>',
      lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
      'check-circle': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
      database: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
      upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0-5 5m5-5 5 5"/><path d="M20 16v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2"/></svg>',
      refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 0 1-13.6 5.7M4 12A8 8 0 0 1 17.6 6.3M18 3v5h-5M6 21v-5h5"/></svg>',
      'search-check': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M8 11l2 2 4-5"/></svg>',
      gauge: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15a8 8 0 1 1 16 0"/><path d="m12 15 4-5"/><path d="M8 19h8"/></svg>',
      box: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></svg>',
      settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 0 0 .1-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 5.5h-6l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 .1 2l-2.1 1.5 2 3.4 2.5-1a8 8 0 0 0 1.6.9L9 22h6l.4-2.7a8 8 0 0 0 1.6-.9l2.5 1 2-3.4z"/></svg>',
      search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>',
      filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v5l-4 2v-7z"/></svg>',
      headphones: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h4v6H5a1 1 0 0 1-1-1zM20 14h-4v6h3a1 1 0 0 0 1-1z"/></svg>',
      monitor: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1"/><path d="M9 21h6M12 16v5"/></svg>',
      keyboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M7 14h10"/></svg>',
      mouse: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 3v7"/></svg>',
      rocket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4c3 0 5-1 6-2-1 5-3 9-7 12l-4 4-3-3 4-4C11 8 12 6 14 4z"/><path d="M6 15l-3 6 6-3M9 6H5l-2 4 4 1"/></svg>',
      shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></svg>',
      chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-8M22 20V7"/></svg>',
      user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    };
    return icons[name] || '';
  }

  private styles() {
    return `:root {
  --bg: #ffffff;
  --paper: #f7f9fc;
  --ink: #111827;
  --muted: #637083;
  --line: #dfe6ef;
  --soft-line: #edf1f6;
  --graphite: #111821;
  --graphite-2: #17202b;
  --red: #e1182d;
  --red-dark: #c71023;
  --green: #22b35f;
  --orange: #ff6b00;
  --shadow: 0 22px 70px rgba(15, 23, 42, 0.13);
  --small-shadow: 0 10px 34px rgba(15, 23, 42, 0.08);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); letter-spacing: 0; }
a { color: inherit; text-decoration: none; }
svg { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(14px);
}
.header-inner {
  min-height: 72px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 28px;
}
.brand { display: inline-flex; align-items: center; font-weight: 900; font-size: 29px; line-height: 1; }
.brand strong { color: var(--red); font-weight: 900; }
.nav { display: flex; align-items: center; justify-content: center; gap: 44px; color: #202938; font-size: 15px; font-weight: 750; }
.nav a:hover { color: var(--red); }
.header-actions { justify-self: end; display: flex; align-items: center; gap: 14px; }
.primary-button, .secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 58px;
  border-radius: 4px;
  padding: 0 28px;
  font-weight: 850;
  font-size: 16px;
  line-height: 1;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}
.primary-button { background: var(--red); color: #fff; box-shadow: 0 18px 34px rgba(225, 24, 45, 0.22); }
.primary-button:hover { background: var(--red-dark); }
.secondary-button { color: var(--ink); background: #fff; border-color: #cfd8e4; }
.secondary-button:hover { border-color: #aeb9c8; }
.secondary-button.light { background: transparent; }
.compact { min-height: 46px; padding: 0 20px; font-size: 14px; }
.button-reset { font-family: inherit; }
.hero {
  border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, #fff 0%, #fff 84%, var(--paper) 100%);
}
.hero-inner {
  max-width: 1400px;
  min-height: 720px;
  margin: 0 auto;
  padding: 58px 40px 54px;
  display: grid;
  grid-template-columns: 0.82fr 1.18fr;
  align-items: center;
  gap: 72px;
}
.hero-copy { align-self: center; }
h1, h2, h3, p { margin-top: 0; }
h1 { max-width: 600px; margin-bottom: 28px; font-size: clamp(48px, 5.2vw, 68px); line-height: 1.08; letter-spacing: 0; font-weight: 900; }
.hero-lead { max-width: 560px; margin-bottom: 34px; color: #4d5a6a; font-size: 20px; line-height: 1.65; }
.hero-actions { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
.auth-note { display: inline-flex; align-items: center; gap: 9px; margin: 0; color: #6f7b89; font-size: 14px; }
.auth-note svg { color: #7d8794; }
.dashboard-preview {
  width: 100%;
  border: 1px solid #d8e0ea;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.preview-flow {
  min-height: 112px;
  display: grid;
  grid-template-columns: 1fr 1.4fr 0.8fr;
  align-items: center;
  gap: 18px;
  padding: 22px 30px;
  border-bottom: 1px solid var(--line);
}
.flow-brand, .flow-market { display: flex; align-items: center; gap: 14px; font-size: 16px; font-weight: 850; }
.a-mark { font-size: 46px; line-height: 1; font-weight: 950; color: #060a12; letter-spacing: 0; }
.flow-sync { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--green); font-size: 11px; font-weight: 850; text-align: center; }
.flow-sync > span { position: absolute; top: 20px; left: -34%; right: -34%; border-top: 2px dotted #98a4b3; z-index: 0; }
.flow-sync b { position: relative; z-index: 1; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--green); color: #fff; }
.flow-market svg { width: 40px; height: 40px; color: var(--orange); stroke-width: 2.4; }
.preview-shell { display: grid; grid-template-columns: 146px 1fr; min-height: 520px; }
.preview-sidebar { padding: 26px 18px; background: linear-gradient(180deg, #151b24, #111820); color: #b9c4d3; display: flex; flex-direction: column; gap: 18px; font-weight: 750; font-size: 14px; }
.preview-sidebar span { display: flex; align-items: center; gap: 9px; }
.preview-sidebar .active { color: #fff; }
.preview-content { padding: 26px 28px 24px; background: #fff; }
.preview-content h2 { margin: 0 0 22px; font-size: 24px; line-height: 1.1; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 18px; }
.stat-grid div, .preview-panels section {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 0 rgba(15,23,42,0.02);
}
.stat-grid div { padding: 18px; }
.stat-grid span, .metric-grid span { display: block; color: #6d7786; font-size: 12px; font-weight: 800; margin-bottom: 10px; }
.stat-grid strong { display: flex; align-items: baseline; gap: 12px; font-size: 27px; line-height: 1; }
.stat-grid em { padding: 4px 7px; border-radius: 999px; background: #e9f8ef; color: var(--green); font-style: normal; font-size: 12px; font-weight: 900; }
.preview-panels { display: grid; grid-template-columns: 1.25fr 0.75fr; gap: 16px; margin-bottom: 16px; }
.preview-panels.lower { grid-template-columns: 1fr 1fr; margin-bottom: 0; }
.preview-panels section { padding: 18px; }
.preview-panels h3 { margin-bottom: 14px; font-size: 14px; line-height: 1.15; }
.sync-panel dl, .queue-panel dl { margin: 0; display: grid; gap: 12px; }
.sync-panel dl div, .queue-panel dl div { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; font-weight: 800; }
.sync-panel dt { color: var(--green); }
.sync-panel dd, .queue-panel dd { margin: 0; color: var(--green); }
.sync-panel dd span { color: #6d7786; margin-left: 18px; }
.queue-panel dt, .queue-panel dd { color: #1b2330; }
.validation-list, .update-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; font-size: 13px; }
.validation-list li, .update-list li { display: flex; justify-content: space-between; gap: 12px; }
.validation-list strong { color: var(--green); }
.validation-list .warn { color: var(--orange); }
.update-list em { color: #6d7786; font-style: normal; white-space: nowrap; }
.preview-panels a { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; color: #2761c8; font-size: 13px; font-weight: 850; }
.process-section { padding: 54px 40px 62px; border-bottom: 1px solid var(--line); background: #fff; }
.section-title.centered { max-width: 760px; margin: 0 auto 42px; text-align: center; }
.section-title h2, .control-copy h2, .auth-copy h2 { margin-bottom: 12px; font-size: clamp(30px, 3vw, 39px); line-height: 1.12; font-weight: 900; }
.section-title p, .control-copy p, .auth-copy p { color: var(--muted); font-size: 16px; line-height: 1.6; }
.process-rail {
  max-width: 1160px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 86px 1fr 86px 1fr 86px 1fr;
  align-items: start;
  gap: 12px;
}
.process-rail article { text-align: center; }
.process-icon {
  display: inline-grid;
  place-items: center;
  width: 92px;
  height: 92px;
  margin-bottom: 22px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: #101826;
  background: #fff;
}
.process-icon svg { width: 40px; height: 40px; stroke-width: 1.8; }
.process-icon.red { color: var(--red); }
.process-icon.orange { color: var(--orange); }
.process-rail h3 { margin-bottom: 12px; font-size: 15px; font-weight: 900; }
.process-rail p { max-width: 190px; margin: 0 auto; color: #4f5a68; font-size: 15px; line-height: 1.55; }
.rail-arrow { display: grid; place-items: center; height: 92px; color: #111827; }
.rail-arrow svg { width: 52px; height: 24px; stroke-width: 1.8; }
.control-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 48px 40px 38px;
  display: grid;
  grid-template-columns: 0.78fr 1.22fr;
  gap: 70px;
  align-items: center;
}
.check-list, .auth-checks { list-style: none; padding: 0; margin: 24px 0 34px; display: grid; gap: 16px; color: #263244; font-weight: 650; }
.check-list li, .auth-checks li { display: flex; align-items: center; gap: 12px; line-height: 1.4; }
.check-list svg { color: var(--red); }
.auth-checks svg { color: var(--green); }
.explore-button { width: fit-content; min-height: 54px; }
.products-panel {
  padding: 30px 34px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--small-shadow);
  overflow-x: auto;
}
.table-title { margin-bottom: 22px; font-size: 22px; font-weight: 900; }
.tabs, .filters { display: flex; gap: 22px; align-items: center; margin-bottom: 18px; color: #637083; font-size: 12px; font-weight: 850; }
.tabs .active { color: #0f172a; }
.filters { gap: 12px; }
.filters span { display: inline-flex; align-items: center; gap: 7px; min-height: 34px; padding: 0 14px; border: 1px solid var(--line); border-radius: 4px; background: #fff; }
.filters span:first-child { min-width: 280px; justify-content: flex-start; color: #8a94a3; }
table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 13px; }
th { padding: 13px 10px; color: #667386; text-align: left; font-size: 11px; font-weight: 900; border-bottom: 1px solid var(--line); }
td { padding: 13px 10px; color: #263244; border-bottom: 1px solid #eef2f6; white-space: nowrap; }
td:first-child { display: flex; align-items: center; gap: 8px; font-weight: 850; }
td svg { color: #101826; }
td b { padding: 4px 9px; border-radius: 999px; background: #eaf8ef; color: var(--green); font-size: 11px; }
td b.danger { background: #ffe8ea; color: var(--red); }
.table-link { display: inline-flex; gap: 7px; align-items: center; margin-top: 18px; color: #2761c8; font-size: 13px; font-weight: 850; }
.benefits-section { padding: 34px 40px 56px; background: #fff; }
.benefits-section h2 { margin: 0 auto 42px; text-align: center; font-size: clamp(28px, 3.2vw, 38px); line-height: 1.16; font-weight: 900; }
.benefit-grid { max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); }
.benefit-grid article { display: grid; grid-template-columns: 42px 1fr; gap: 18px; padding: 8px 28px 8px 0; background: #fff; }
.benefit-grid article > svg { width: 32px; height: 32px; color: #111827; }
.benefit-grid h3 { margin-bottom: 10px; font-size: 16px; line-height: 1.2; }
.benefit-grid p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.55; }
.auth-section { padding: 34px 40px 32px; background: #fff; }
.auth-card-large {
  max-width: 1320px;
  margin: 0 auto;
  padding: 42px 44px 34px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 30px rgba(15,23,42,0.04);
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 38px 58px;
  align-items: center;
}
.auth-diagram { display: grid; grid-template-columns: 150px 1fr 170px 1fr 150px; align-items: center; gap: 18px; }
.auth-node {
  min-height: 150px;
  display: grid;
  place-items: center;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--small-shadow);
}
.auth-node strong { font-size: 22px; line-height: 1.15; }
.auth-node span { color: var(--muted); font-size: 13px; font-weight: 700; }
.auth-node svg { width: 36px; height: 36px; color: #101826; }
.auth-node:last-child svg { color: var(--orange); }
.auth-core {
  position: relative;
  display: grid;
  place-items: center;
  width: 154px;
  height: 154px;
  justify-self: center;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  background: #fff;
}
.auth-core strong { font-size: 48px; line-height: 1; }
.auth-core span { font-weight: 850; }
.auth-core em { position: absolute; right: 12px; bottom: 9px; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--green); color: #fff; font-style: normal; }
.dash-line { border-top: 2px dashed #7b8794; height: 1px; }
.auth-actions { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 22px; flex-wrap: wrap; }
.auth-actions p { width: 100%; margin: 0; color: #6f7b89; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; }
.footer { background: #111820; color: #d8dee8; }
.footer-inner { max-width: 1400px; margin: 0 auto; padding: 36px 40px 28px; display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 44px; }
.footer h2, .footer h3 { color: #fff; margin-bottom: 15px; }
.footer h2 { font-size: 26px; }
.footer h3 { font-size: 14px; }
.footer p, .footer a { color: #c0c9d6; font-size: 14px; line-height: 1.7; }
.footer nav { display: grid; align-content: start; gap: 8px; }
.footer-bottom { max-width: 1400px; margin: 0 auto; padding: 16px 40px 24px; border-top: 1px solid rgba(255,255,255,0.12); display: flex; justify-content: space-between; gap: 18px; color: #aeb8c6; font-size: 13px; }
.auth-screen { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: var(--paper); }
.auth-card { width: min(100%, 520px); padding: 38px; border-radius: 8px; background: #fff; box-shadow: var(--shadow); }
.auth-brand { margin-bottom: 34px; }
.auth-card h1 { font-size: clamp(34px, 5vw, 52px); line-height: 1.02; margin-bottom: 18px; }
.auth-card p { color: var(--muted); font-size: 18px; line-height: 1.6; }
.auth-card .primary-button, .auth-card .secondary-button { width: 100%; margin-top: 14px; }
.dashboard-shell { padding: clamp(34px, 6vw, 68px) clamp(20px, 5vw, 72px); background: var(--paper); min-height: calc(100vh - 72px); }
.dashboard-hero { max-width: 820px; margin-bottom: 34px; }
.dashboard-hero h1 { font-size: clamp(40px, 6vw, 70px); margin-bottom: 18px; }
.dashboard-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--line); }
.dashboard-grid article { background: #fff; padding: 28px; }
.dashboard-grid span { display: block; margin-bottom: 24px; color: var(--red); font-weight: 900; }
.dashboard-grid strong { display: block; font-size: 24px; line-height: 1.15; margin-bottom: 12px; }
@media (max-width: 1100px) {
  .header-inner { grid-template-columns: 1fr; justify-items: start; padding: 16px 24px; }
  .nav { justify-content: flex-start; flex-wrap: wrap; gap: 22px; }
  .header-actions { justify-self: start; }
  .hero-inner, .control-section, .auth-card-large { grid-template-columns: 1fr; }
  .hero-inner { min-height: auto; gap: 42px; }
  .process-rail { grid-template-columns: 1fr; gap: 22px; }
  .rail-arrow { height: 20px; transform: rotate(90deg); }
  .benefit-grid { grid-template-columns: 1fr 1fr; }
  .footer-inner { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 720px) {
  .header-inner, .hero-inner, .process-section, .control-section, .benefits-section, .auth-section { padding-left: 20px; padding-right: 20px; }
  .brand { font-size: 24px; }
  .nav { display: none; }
  .header-actions, .hero-actions { width: 100%; }
  .primary-button, .secondary-button { width: 100%; min-height: 48px; }
  h1 { font-size: 42px; line-height: 1.02; }
  .hero-lead { font-size: 17px; }
  .preview-flow { grid-template-columns: 1fr; padding: 20px; }
  .flow-sync > span { display: none; }
  .preview-shell { grid-template-columns: 1fr; }
  .preview-sidebar { display: none; }
  .preview-content { padding: 20px; }
  .stat-grid, .preview-panels, .preview-panels.lower, .benefit-grid, .dashboard-grid { grid-template-columns: 1fr; }
  .process-icon { width: 74px; height: 74px; }
  .products-panel { padding: 22px 18px; }
  .filters { flex-wrap: wrap; }
  .filters span:first-child { min-width: 100%; }
  .auth-card-large { padding: 28px 20px; }
  .auth-diagram { grid-template-columns: 1fr; justify-items: center; }
  .dash-line { width: 1px; height: 28px; border-top: 0; border-left: 2px dashed #7b8794; }
  .auth-actions .primary-button, .auth-actions .secondary-button { width: 100%; }
  .footer-inner { grid-template-columns: 1fr; padding: 32px 20px 24px; }
  .footer-bottom { flex-direction: column; padding-left: 20px; padding-right: 20px; }
}`;
  }
}
