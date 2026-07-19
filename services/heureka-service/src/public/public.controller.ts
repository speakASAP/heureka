import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { FAVICON_ICO } from './favicon.assets';
import { consentBannerSource, consentCoreSource } from './consent.assets';

type PublicPage = 'landing' | 'login' | 'register' | 'callback' | 'dashboard';

@Controller()
export class PublicController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  landing() {
    return this.renderPage('landing', 'Alfares Heureka | Automatizace prodeje na Heurece', this.landingBody());
  }

  // Oba moduly leží pod /ui/, protože consent-banner.js importuje
  // './consent-core.js' a prohlížeč to řeší vůči stejnému prefixu.
  @Get('ui/consent-core.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  consentCore(): string {
    return consentCoreSource;
  }

  @Get('ui/consent-banner.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  consentBanner(): string {
    return consentBannerSource;
  }

  @Get('favicon.ico')
  @Header('Content-Type', 'image/x-icon')
  @Header('Cache-Control', 'public, max-age=604800')
  favicon() {
    return new StreamableFile(FAVICON_ICO);
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

  @Get('dashboard/products')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboardProducts() {
    return this.dashboard();
  }

  @Get('dashboard/feed')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboardFeed() {
    return this.dashboard();
  }

  @Get('dashboard/orders')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboardOrders() {
    return this.dashboard();
  }

  @Get('dashboard/orders/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboardOrderDetail() {
    return this.dashboard();
  }

  @Get('dashboard/operations')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboardOperations() {
    return this.dashboard();
  }

  @Get('dashboard/settings')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboardSettings() {
    return this.dashboard();
  }

  @Get('dashboard/admin/users')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboardAdminUsers() {
    return this.dashboard();
  }

  private renderPage(page: PublicPage, title: string, body: string) {
    return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="Alfares Heureka pomáhá prodávat vlastní produkty, zlevněné dodavatelské produkty Alfares i sdílený katalog dalších uživatelů přes automatizovaný Heureka feed.">
    <style>${this.styles()}</style>
  </head>
  <body data-page="${page}">
    ${body}
    <script>${this.authScript(page)}</script>
    <script type="module">
      import { mountConsentBanner } from '/ui/consent-banner.js';
      mountConsentBanner({
        version: 'alfares-consent-v1',
        policyUrl: 'https://alfares.cz/cs/legal/cookie-policy',
        text: {
          title: 'Cookies a úložiště',
          disclosureBody: 'Ukládáme jen údaje nezbytné pro přihlášení a chod služby. Nepoužíváme analytické ani marketingové cookies.',
          acknowledge: 'Rozumím',
          policyLabel: 'Zásady cookies',
        },
      });
    </script>
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
        <h1>Prodávejte vlastní, Alfares i sdílené produkty na Heurece</h1>
        <p class="hero-lead">Vyberte si zlevněné produkty od Alfares a firemních dodavatelů, publikujte vlastní sortiment a resellujte dostupné produkty dalších uživatelů ze sdíleného katalogu. Alfares automatizuje feed, listingy, marketplace data, objednávky a platby tam, kde to Heureka a napojené systémy dovolí.</p>
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
      <p>Alfares připraví technickou část prodeje; zákazník spravuje produkty, připojí marketplace přístup, prodává a odesílá zboží.</p>
    </div>
    <div class="process-rail">
      <article>
        <span class="process-icon">${this.icon('database')}</span>
        <h3>1. Zdroje produktů</h3>
        <p>Vlastní sortiment, zlevněné Alfares/dodavatelské produkty a sdílený katalog ostatních uživatelů.</p>
      </article>
      <span class="rail-arrow">${this.icon('arrow-right')}</span>
      <article>
        <span class="process-icon red">${this.icon('upload')}</span>
        <h3>2. Listing a validace</h3>
        <p>Automatické naplnění marketplace účtu, mapování kategorií, kontrola dat a pravidla Heureky.</p>
      </article>
      <span class="rail-arrow">${this.icon('arrow-right')}</span>
      <article>
        <span class="process-icon red">${this.icon('refresh')}</span>
        <h3>3. Objednávky a platby</h3>
        <p>Automatizace objednávek, plateb a stavů tam, kde to napojený kanál a účet podporuje.</p>
      </article>
      <span class="rail-arrow">${this.icon('arrow-right')}</span>
      <article>
        <span class="process-icon orange">${this.icon('search-check')}</span>
        <h3>4. Prodej a expedice</h3>
        <p>Zákazník řídí nabídku, prodává pod svým účtem a zajišťuje odeslání zboží.</p>
      </article>
    </div>
  </section>

  <section id="control" class="control-section">
    <div class="control-copy">
      <h2>Plná kontrola nad vaší nabídkou</h2>
      <p>Mějte přehled o vlastních produktech, Alfares sortimentu, sdíleném resale katalogu, stavech feedů a kvalitě dat na jednom místě. Reagujte rychle a s jistotou.</p>
      <ul class="check-list">
        <li>${this.icon('check-circle')} Přehled o vlastních, Alfares a sdílených produktech pro resale</li>
        <li>${this.icon('check-circle')} Fronta aktualizací a historie změn</li>
        <li>${this.icon('check-circle')} Validace feedu a upozornění na chyby</li>
        <li>${this.icon('check-circle')} Detailní logy a auditní stopa</li>
        <li>${this.icon('check-circle')} Nastavení pravidel, marketplace přístupu a mapování kategorií</li>
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
      <article>${this.icon('rocket')}<div><h3>Rychlejší uvedení nabídek</h3><p>Nové vlastní, Alfares i sdílené produkty se na Heurece objeví rychleji díky automatizaci.</p></div></article>
      <article>${this.icon('shield')}<div><h3>Méně lidských chyb</h3><p>Validace a pravidla minimalizují chyby v datech a zamítnutí nabídek.</p></div></article>
      <article>${this.icon('refresh')}<div><h3>Vždy aktuální data</h3><p>Ceny, sklad i dostupnost jsou synchronizované v reálném čase.</p></div></article>
      <article>${this.icon('chart')}<div><h3>Větší prodejní dosah</h3><p>Jeden účet může prodávat vlastní zboží, zlevněný Alfares sortiment i dostupné produkty sdíleného katalogu.</p></div></article>
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
    <div><h2>Alfares Heureka</h2><p>Automatizovaný prodejní kanál pro vlastní produkty, Alfares dodavatelské zboží a sdílený resale katalog na Heurece. Plná kontrola, žádné ruční chyby.</p></div>
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
    return `<main class="dashboard-app" id="heureka-dashboard">
  <aside class="dashboard-sidebar">
    <a class="dashboard-logo" href="/" aria-label="Alfares Heureka"><span>heureka</span><strong>!</strong></a>
    <nav class="dashboard-nav" aria-label="Dashboard navigation">
      <a href="/dashboard" data-dashboard-link="feed"><span class="nav-icon">${this.icon('home')}</span>Overview</a>
      <a href="/dashboard/products" data-dashboard-link="products"><span class="nav-icon">${this.icon('database')}</span>Products</a>
      <a href="/dashboard/products" data-dashboard-link="products" class="nav-child">Catalog products</a>
      <a href="/dashboard/feed" data-dashboard-link="feed" class="nav-child">Feed</a>
      <a href="/dashboard/products" data-dashboard-link="products" class="nav-child">Edit queue</a>
      <a href="/dashboard/orders" data-dashboard-link="orders"><span class="nav-icon">${this.icon('cart')}</span>Orders</a>
      <a href="/dashboard/operations" data-dashboard-link="operations"><span class="nav-icon">${this.icon('chart')}</span>Operations</a>
      <a href="/dashboard/settings" data-dashboard-link="settings"><span class="nav-icon">${this.icon('settings')}</span>Settings</a>
      <a href="/dashboard/admin/users" id="admin-link" data-dashboard-link="admin" hidden><span class="nav-icon">${this.icon('shield')}</span>Admin</a>
      <a href="/dashboard/admin/users" id="admin-users-link" data-dashboard-link="admin" class="nav-child" hidden>Users</a>
    </nav>
    <div class="dashboard-sidebar-foot">
      <span>Shop ID: 12345</span>
      <span><i class="status ok"></i>Production</span>
      <button class="sidebar-collapse button-reset" type="button">‹ Collapse</button>
    </div>
  </aside>
  <section class="dashboard-shell">
    <header class="dashboard-topbar">
      <h1>Heureka Dashboard</h1>
      <div class="topbar-status">
        <span><i class="status ok"></i><span id="feed-pill">Heureka feed: loading</span></span>
        <span>Last sync: just now</span>
        <button class="icon-button button-reset" id="dashboard-refresh" type="button" title="Refresh">${this.icon('refresh')}</button>
        <button class="icon-button button-reset" type="button" title="Help">${this.icon('help')}</button>
        <button class="icon-button button-reset" type="button" title="Notifications">${this.icon('bell')}</button>
        <span class="user-avatar">TA</span>
        <span class="dashboard-user-name" id="dashboard-user">Loading session</span>
        <button class="icon-button button-reset" type="button" id="logout-button" title="Log out">${this.icon('external')}</button>
      </div>
    </header>
    <div class="dashboard-workspace">
      <div class="dashboard-metrics" id="dashboard-metrics"></div>
      <section class="dashboard-products" id="products-section">
        <div class="products-table-panel">
          <div class="products-toolbar">
            <div>
              <h2>Catalog products</h2>
              <p id="products-count">Loading products</p>
            </div>
            <div class="products-toolbar-actions">
              <a class="secondary-button light catalog-link" href="https://catalog.alfares.cz/dashboard/products" target="_blank" rel="noreferrer">Catalog Dashboard ${this.icon('external')}</a>
              <a class="secondary-button light catalog-link" href="https://catalog.alfares.cz/dashboard/products/new" target="_blank" rel="noreferrer">New product ${this.icon('external')}</a>
              <button class="secondary-button light button-reset" id="regenerate-feed" type="button">${this.icon('refresh')} Regenerate feed</button>
              <a class="primary-button catalog-link" href="https://catalog.alfares.cz/dashboard/settings" target="_blank" rel="noreferrer">Source settings ${this.icon('external')}</a>
            </div>
          </div>
          <div class="catalog-source-strip" id="catalog-source-strip">
            <div><strong>Catalog source</strong><span id="catalog-source-copy">Own, Alfares and community products from Catalog effective access.</span></div>
            <div class="catalog-source-actions">
              <a href="https://catalog.alfares.cz/dashboard/products" target="_blank" rel="noreferrer">Manage products</a>
              <a href="https://catalog.alfares.cz/dashboard/products/new" target="_blank" rel="noreferrer">Create product</a>
              <a href="https://catalog.alfares.cz/dashboard/settings" target="_blank" rel="noreferrer">Source settings</a>
            </div>
          </div>
          <div class="products-filter">
            <input id="products-search" type="search" placeholder="Search by name, SKU, EAN">
            <select id="products-source-filter" aria-label="Catalog source"><option value="">All Catalog sources</option><option value="own">My products</option><option value="alfares">Alfares products</option><option value="community">Community resale</option></select>
            <select id="products-gap-filter" aria-label="Data gap"><option value="">All data states</option><option value="missing_category">Missing category</option><option value="has_category">Has category</option><option value="image">Missing image</option><option value="stock">Zero stock</option></select>
            <select id="products-feed-status" aria-label="Feed status"><option value="">All feed statuses</option><option value="included">Included</option><option value="excluded">Excluded</option></select>
            <select id="products-workflow-status" aria-label="Workflow status"><option value="">All workflow statuses</option><option value="ready">Ready</option><option value="draft">Draft</option><option value="included">Included</option><option value="blocked">Blocked</option></select>
            <button class="secondary-button light button-reset" id="products-search-button" type="button">${this.icon('filter')} Filters</button>
          </div>
          <div class="bulk-row"><label><input id="products-select-all" type="checkbox"> <span id="bulk-selected-count">0 selected</span></label><button class="secondary-button light button-reset" id="bulk-readiness-preview" type="button" disabled>Preview readiness</button><span id="bulk-readiness-summary"></span></div>
          <div class="table-scroll">
            <table class="dashboard-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Source</th>
                  <th>Heureka status</th>
                  <th>Feed status</th>
                  <th>Data quality</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="products-table-body"></tbody>
            </table>
          </div>
        </div>
        <aside class="listing-panel" id="listing-panel"></aside>
      </section>
      <section class="admin-panel" id="orders-section" hidden>
        <div class="products-toolbar">
          <div>
            <h2>Orders</h2>
            <p id="orders-count">Loading Heureka orders</p>
          </div>
          <select id="orders-status-filter" aria-label="Local order status"><option value="all">All local statuses</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select>
        </div>
        <div id="orders-metrics" class="dashboard-metrics"></div>
        <div class="orders-workspace">
          <div class="table-scroll orders-table-panel">
            <table class="dashboard-table">
              <thead>
                <tr><th>External ID</th><th>Central order</th><th>Customer</th><th>Total</th><th>Lifecycle</th><th>Local</th><th>Forwarding</th><th>Created</th><th></th></tr>
              </thead>
              <tbody id="orders-table-body"></tbody>
            </table>
          </div>
          <aside class="order-detail-panel" id="order-detail-panel">
            <div class="dashboard-notice">Select an order to inspect central lifecycle, payment and delivery status.</div>
          </aside>
        </div>
      </section>
      <section class="admin-panel" id="operations-section" hidden>
        <div class="products-toolbar">
          <div>
            <h2>Operations</h2>
            <p>Feed generation, runtime wiring and recent activity</p>
          </div>
          <button class="secondary-button light button-reset" id="operations-regenerate-feed" type="button">${this.icon('refresh')} Regenerate feed</button>
        </div>
        <div id="operations-metrics" class="dashboard-metrics"></div>
        <div class="table-scroll readiness-lanes">
          <table class="dashboard-table">
            <thead>
              <tr><th>Lane</th><th>Status</th><th>Owner</th><th>Products</th><th>Next action</th></tr>
            </thead>
            <tbody id="readiness-lanes-body"></tbody>
          </table>
        </div>
        <div class="dashboard-notice" id="readiness-lanes-missing"></div>
        <div class="table-scroll readiness-lanes">
          <table class="dashboard-table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Readiness</th><th>Blockers</th><th>Action</th></tr>
            </thead>
            <tbody id="readiness-blocked-products-body"></tbody>
          </table>
        </div>
        <div class="table-scroll">
          <table class="dashboard-table">
            <thead>
              <tr><th>Feed type</th><th>Status</th><th>Products</th><th>Generated</th><th>URL</th></tr>
            </thead>
            <tbody id="feed-history-body"></tbody>
          </table>
        </div>
        <div class="dashboard-notice" id="runtime-status"></div>
        <div class="table-scroll operations-timeline">
          <table class="dashboard-table">
            <thead>
              <tr><th>Time</th><th>Type</th><th>Source</th><th>Status</th><th>Summary</th></tr>
            </thead>
            <tbody id="operation-events-body"></tbody>
          </table>
        </div>
        <div class="dashboard-notice" id="operation-events-missing"></div>
      </section>
      <section class="admin-panel" id="settings-section" hidden>
        <div class="products-toolbar">
          <div>
            <h2>Settings</h2>
            <p>Read-only channel configuration and runtime endpoints</p>
          </div>
        </div>
        <div id="settings-metrics" class="dashboard-metrics"></div>
        <div class="dashboard-notice" id="settings-body"></div>
      </section>
      <section class="admin-panel" id="admin-section" hidden>
        <div class="products-toolbar">
          <div>
            <h2>Users</h2>
            <p id="admin-count">Registered Auth users and Heureka usage statistics</p>
          </div>
          <button class="secondary-button light button-reset" type="button">+ Add user</button>
        </div>
        <div id="admin-metrics" class="dashboard-metrics"></div>
        <div class="table-scroll">
          <table class="dashboard-table">
            <thead>
              <tr><th>Email</th><th>Name</th><th>Type</th><th>Status</th><th>Verified</th></tr>
            </thead>
            <tbody id="admin-users-body"></tbody>
          </table>
        </div>
      </section>
    </div>
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
  var CATALOG_PRODUCTS_URL = 'https://catalog.alfares.cz/dashboard/products';
  var CATALOG_CREATE_URL = 'https://catalog.alfares.cz/dashboard/products/new';
  var CATALOG_SETTINGS_URL = 'https://catalog.alfares.cz/dashboard/settings';

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

  function provisionCatalogAccess(accessToken) {
    return window.fetch('/api/catalog/access/provision', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ sourceApplication: AUTH_CLIENT_ID })
    }).then(function (response) {
      return response.text().then(function (rawText) {
        var payload = rawText ? JSON.parse(rawText) : {};
        if (!response.ok || payload.success === false) {
          throw new Error((payload.error && payload.error.message) || payload.message || 'Catalog provisioning failed: ' + response.status);
        }
        window.localStorage.removeItem('heurekaCatalogProvisionWarning');
        return payload;
      });
    }).catch(function (error) {
      window.localStorage.setItem('heurekaCatalogProvisionWarning', text(error.message || error));
      return null;
    });
  }

  function handleCallback() {
    var status = document.getElementById('callback-status');
    var actions = document.getElementById('callback-actions');
    var hash = window.location.hash ? window.location.hash.slice(1) : '';
    if (hash) window.history.replaceState(null, document.title, AUTH_CALLBACK_PATH);
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
    if (status) status.textContent = 'Připravujeme váš katalogový prostor.';
    provisionCatalogAccess(accessToken).then(function () {
      window.history.replaceState(null, document.title, AUTH_CALLBACK_PATH);
      window.location.replace(returnTo);
    });
  }

  function api(path, options) {
    var token = window.localStorage.getItem('accessToken');
    return window.fetch(path, {
      method: options && options.method ? options.method : 'GET',
      headers: Object.assign({
        'content-type': 'application/json',
        Authorization: 'Bearer ' + token
      }, options && options.headers ? options.headers : {}),
      body: options && options.body ? JSON.stringify(options.body) : undefined
    }).then(function (response) {
      return response.text().then(function (text) {
        var payload = text ? JSON.parse(text) : {};
        if (!response.ok || payload.success === false) {
          throw new Error((payload.error && payload.error.message) || payload.message || 'Request failed: ' + response.status);
        }
        return payload;
      });
    });
  }

  function text(value) {
    return String(value == null ? '' : value);
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('cs-CZ').format(Number(value || 0));
  }

  var CENTRAL_ORDER_LIFECYCLE_LABELS = {
    ordered_unpaid: 'Ordered unpaid',
    payment_failed: 'Payment failed',
    paid_not_delivered: 'Paid, not delivered',
    warehouse_fulfillment_requested: 'Warehouse fulfillment requested',
    warehouse_collecting: 'Warehouse collecting',
    warehouse_forming: 'Warehouse forming shipment',
    warehouse_formed: 'Warehouse shipment formed',
    handed_to_delivery: 'Handed to delivery',
    in_delivery: 'In delivery',
    received: 'Received',
    not_received: 'Not received',
    returned: 'Returned',
    cancelled: 'Cancelled'
  };

  function humanize(value) {
    var normalized = text(value || 'unknown');
    return CENTRAL_ORDER_LIFECYCLE_LABELS[normalized] || normalized.replace(/_/g, ' ');
  }

  function statusChip(status) {
    var normalized = text(status || 'unknown');
    return '<span class="feed-pill status-' + escapeHtml(normalized.replace(/_/g, '-')) + '">' + escapeHtml(humanize(normalized)) + '</span>';
  }

  function renderBlockers(product) {
    var blockers = product.blockers && product.blockers.length
      ? product.blockers
      : (product.gaps || []).map(function (gap) { return { code: String(gap).toUpperCase(), message: gap }; });
    return blockers.length
      ? blockers.map(function (blocker) { return '<span class="feed-pill quality-warn">' + escapeHtml(blocker.code || blocker.field || blocker.message) + '</span>'; }).join('')
      : '<span class="feed-pill quality-good">Ready</span>';
  }

  function countReadinessBlockers(items) {
    return (items || []).reduce(function (counts, item) {
      (item.blockers || []).forEach(function (blocker) {
        var code = text(blocker.code || blocker.field || '');
        if (code) counts[code] = (counts[code] || 0) + 1;
      });
      return counts;
    }, {});
  }

  function qualityClass(value) {
    if (Number(value) >= 85) return 'quality-good';
    if (Number(value) >= 60) return 'quality-warn';
    return 'quality-bad';
  }

  function iconMarkup(name) {
    var icons = {
      cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>',
      'check-circle': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
      database: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M12 3v9h9"/></svg>',
      warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20L12 3z"/><path d="M12 9v5M12 18h.01"/></svg>',
      chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>'
    };
    return icons[name] || icons.database;
  }

  function setActiveDashboardRoute() {
    var path = window.location.pathname;
    var key = path.indexOf('/dashboard/admin') === 0 ? 'admin'
      : (path.indexOf('/dashboard/orders') === 0 ? 'orders'
      : (path.indexOf('/dashboard/operations') === 0 ? 'operations'
      : (path.indexOf('/dashboard/settings') === 0 ? 'settings'
      : (path === '/dashboard' || path.indexOf('/dashboard/feed') === 0 ? 'feed' : 'products'))));
    Array.prototype.forEach.call(document.querySelectorAll('[data-dashboard-link]'), function (link) {
      link.classList.toggle('active', link.getAttribute('data-dashboard-link') === key);
    });
    var activeSection = key === 'feed' ? 'products' : key;
    var sections = {
      products: document.getElementById('products-section'),
      orders: document.getElementById('orders-section'),
      operations: document.getElementById('operations-section'),
      settings: document.getElementById('settings-section'),
      admin: document.getElementById('admin-section')
    };
    Object.keys(sections).forEach(function (sectionKey) {
      if (sections[sectionKey]) sections[sectionKey].hidden = sectionKey !== activeSection;
    });
    return key;
  }

  function renderMetrics(summary) {
    var root = document.getElementById('dashboard-metrics');
    var feedPill = document.getElementById('feed-pill');
    if (!root) return;
    var latestStatus = summary.latestFeed && summary.latestFeed.status ? summary.latestFeed.status : 'missing';
    if (feedPill) feedPill.textContent = 'Heureka feed: ' + latestStatus;
    var items = [
      ['cart', 'Catalog products', summary.catalogProducts, 'Catalog active products'],
      ['check-circle', 'Published', summary.includedProducts, (summary.readyPercent || 0) + '% in feed'],
      ['database', 'Ready', summary.activeOffers, 'Editable Heureka listings'],
      ['warning', 'Needs data', summary.needsData, 'Catalog or stock gaps'],
      ['chart', 'Revenue signal', summary.orderCount, 'Heureka orders tracked']
    ];
    root.innerHTML = items.map(function (item) {
      return '<article class="dash-metric"><span class="metric-icon">' + iconMarkup(item[0]) + '</span><div><span>' + escapeHtml(item[1]) + '</span><strong>' + escapeHtml(formatNumber(item[2])) + '</strong><p>' + escapeHtml(item[3]) + '</p></div></article>';
    }).join('');
  }

  function catalogSourceLabel(source) {
    var type = source && source.type ? source.type : 'unknown';
    if (type === 'own') return 'My product';
    if (type === 'alfares') return 'Alfares';
    if (type === 'community') return 'Community';
    return (source && source.label) || 'Catalog';
  }

  function catalogResaleLabel(source) {
    if (!source) return 'Source managed in Catalog';
    if (source.resaleEnabled === true) return 'Shared for resale';
    if (source.resaleEnabled === false) return source.type === 'own' ? 'Private in Catalog' : 'Not shared for resale';
    return 'Resale managed in Catalog';
  }

  function catalogSourceChip(source) {
    var type = source && source.type ? source.type : 'unknown';
    return '<span class="source-chip source-' + escapeHtml(type) + '">' + escapeHtml(catalogSourceLabel(source)) + '</span>';
  }

  function renderCatalogSourceControls(data) {
    var copy = document.getElementById('catalog-source-copy');
    var selected = data && data.catalogSourceFilter ? data.catalogSourceFilter : 'effective';
    var options = Array.isArray(data && data.sourceOptions) ? data.sourceOptions : [];
    var selectedOption = options.filter(function (option) { return option.value === selected; })[0] || options[0];
    if (copy) {
      copy.textContent = selectedOption && selectedOption.copy ? selectedOption.copy : 'Own, Alfares and community products from Catalog effective access.';
    }
  }

  function renderCatalogSourceDetail(product) {
    var source = product.catalogSource || {};
    var canToggleResale = source.canToggleResaleInHeureka === true && source.resaleMutationPath;
    var readOnlyCopy = source.readOnlyCatalogRecord
      ? 'Catalog product record is read-only in Heureka; edit only the Heureka listing here.'
      : 'Owner Catalog product; product data and resale sharing can be changed here or in Catalog Dashboard.';
    var localToggle = canToggleResale
      ? '<label class="check-row resale-toggle-row"><span>Publish this product for community resale</span><input data-resale-toggle="' + escapeHtml(product.id) + '" type="checkbox" ' + (source.resaleEnabled === true ? 'checked' : '') + '></label><p class="table-subtext" id="resale-toggle-status">Owner-only Catalog update through Heureka.</p>'
      : '<p class="table-subtext">Local resale toggle is read-only for this source; Alfares and other seller products keep their Catalog owner guard.</p>';
    return '<div class="catalog-source-card"><strong>Catalog source</strong>' +
      '<p>' + catalogSourceChip(source) + ' ' + escapeHtml(source.label || catalogSourceLabel(source)) + '</p>' +
      '<p>Resale: ' + escapeHtml(catalogResaleLabel(source)) + '</p>' +
      '<p>' + escapeHtml(readOnlyCopy) + '</p>' +
      localToggle +
      '<div class="catalog-source-actions">' +
        '<a href="' + escapeHtml(CATALOG_PRODUCTS_URL) + '" target="_blank" rel="noreferrer">Manage products</a>' +
        '<a href="' + escapeHtml(CATALOG_CREATE_URL) + '" target="_blank" rel="noreferrer">Create product</a>' +
        '<a href="' + escapeHtml(CATALOG_SETTINGS_URL) + '" target="_blank" rel="noreferrer">Resale settings</a>' +
      '</div></div>';
  }

  function renderProducts(products, pagination, catalogData) {
    renderCatalogSourceControls(catalogData || {});
    var body = document.getElementById('products-table-body');
    var count = document.getElementById('products-count');
    if (!body) return;
    if (count) count.textContent = formatNumber((pagination && pagination.filtered) || products.length) + ' shown / ' + formatNumber((pagination && pagination.total) || products.length) + ' products';
    body.innerHTML = products.map(function (product) {
      var image = product.primaryImageUrl ? '<img class="product-thumb" src="' + escapeHtml(product.primaryImageUrl) + '" alt="">' : '<span class="product-thumb"></span>';
      var source = product.catalogSource || {};
      return '<tr data-product-id="' + escapeHtml(product.id) + '">' +
        '<td><input type="checkbox" data-select-product="' + escapeHtml(product.id) + '" aria-label="Select product"></td>' +
        '<td><div class="product-cell">' + image + '<div><strong>' + escapeHtml(product.name) + '</strong><p>' + escapeHtml(product.brand || product.category || 'Catalog product') + '</p></div></div></td>' +
        '<td>' + escapeHtml(product.sku || '') + '</td>' +
        '<td>' + catalogSourceChip(source) + '<p class="table-subtext">' + escapeHtml(catalogResaleLabel(source)) + '</p></td>' +
        '<td>' + statusChip(product.workflowStatus || product.heurekaStatus) + '<p class="table-subtext">Next: ' + escapeHtml(humanize(product.nextAction)) + '</p></td>' +
        '<td>' + statusChip(product.feedStatus) + '</td>' +
        '<td><span class="feed-pill ' + qualityClass(product.dataQuality) + '">' + escapeHtml(product.dataQuality) + '%</span></td>' +
        '<td>' + escapeHtml(formatNumber(product.availableStock || 0)) + '</td>' +
        '<td><button class="table-action button-reset" type="button" data-edit-product="' + escapeHtml(product.id) + '">⋮</button></td>' +
      '</tr>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('[data-edit-product]'), function (button) {
      button.addEventListener('click', function () {
        loadProductDetail(button.getAttribute('data-edit-product'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-select-product]'), function (checkbox) {
      checkbox.addEventListener('change', updateBulkSelection);
    });
    var selectAll = document.getElementById('products-select-all');
    if (selectAll) {
      selectAll.checked = false;
      selectAll.addEventListener('change', function () {
        Array.prototype.forEach.call(document.querySelectorAll('[data-select-product]'), function (checkbox) {
          checkbox.checked = selectAll.checked;
        });
        updateBulkSelection();
      });
    }
    updateBulkSelection();
    if (products[0]) loadProductDetail(products[0].id);
  }

  function selectedProductIds() {
    return Array.prototype.map.call(document.querySelectorAll('[data-select-product]:checked'), function (checkbox) {
      return checkbox.getAttribute('data-select-product');
    }).filter(Boolean);
  }

  function updateBulkSelection() {
    var ids = selectedProductIds();
    var count = document.getElementById('bulk-selected-count');
    var button = document.getElementById('bulk-readiness-preview');
    var summary = document.getElementById('bulk-readiness-summary');
    if (count) count.textContent = ids.length + ' selected';
    if (button) button.disabled = ids.length === 0;
    if (summary && ids.length === 0) summary.textContent = '';
  }

  function previewSelectedReadiness() {
    var ids = selectedProductIds();
    var summary = document.getElementById('bulk-readiness-summary');
    var button = document.getElementById('bulk-readiness-preview');
    if (!ids.length) return;
    if (button) {
      button.disabled = true;
      button.textContent = 'Checking';
    }
    if (summary) summary.textContent = 'Checking selected products';
    api('/heureka/feed/readiness/bulk', { method: 'POST', body: { feedType: 'heureka_cz', productIds: ids } })
      .then(function (payload) {
        var data = payload.data || {};
        var counts = data.blockerCounts || countReadinessBlockers(data.items || []);
        var blockerText = Object.keys(counts).length
          ? Object.keys(counts).map(function (key) { return key + ': ' + counts[key]; }).join(', ')
          : 'no blockers';
        if (summary) summary.textContent = 'Ready ' + formatNumber(data.summary && data.summary.ready || 0) + ' / ' + formatNumber(data.summary && data.summary.total || ids.length) + '; ' + blockerText;
      })
      .catch(showDashboardError)
      .finally(function () {
        if (button) {
          button.textContent = 'Preview readiness';
          updateBulkSelection();
        }
      });
  }

  function renderProductDetail(product) {
    var panel = document.getElementById('listing-panel');
    if (!panel) return;
    var listing = product.listing || {};
    var gaps = renderBlockers(product);
    var profile = product.catalogMarketplaceProfile || {};
    var preview = profile.contentPreview || {};
    var fields = profile.marketplaceFields || {};
    var previewLabel = preview.contractVersion || preview.version || preview.status || profile.status || 'detail preview';
    var fieldCount = Array.isArray(fields.fields) ? fields.fields.length : 0;
    var manualSummary = profile.manualOverrideSummary || {};
    var manualCount = Number(manualSummary.manualFieldCount || 0);
    var staleCount = Number(manualSummary.staleFieldCount || 0);
    var staleFields = Array.isArray(manualSummary.staleFields) ? manualSummary.staleFields.join(', ') : '';
    var marketplaceReview = manualCount || staleCount || manualSummary.reviewRequired
      ? '<p>Manual overrides: ' + escapeHtml(formatNumber(manualCount)) + '</p><p>Source changed: ' + escapeHtml(formatNumber(staleCount)) + '</p>' + (staleFields ? '<p class="catalog-review-warning">Review: ' + escapeHtml(staleFields) + '</p>' : '')
      : '<p>Manual overrides: 0</p>';
    var sourcePanel = renderCatalogSourceDetail(product);
    panel.innerHTML = '<div class="listing-head">' +
      (product.primaryImageUrl ? '<img class="product-thumb large" src="' + escapeHtml(product.primaryImageUrl) + '" alt="">' : '<span class="product-thumb large"></span>') +
      '<div><h3>' + escapeHtml(product.name) + '</h3><p>SKU: ' + escapeHtml(product.sku || '') + '</p></div></div>' +
      '<div class="listing-tabs"><button class="active button-reset" type="button">Listing</button><button class="button-reset" type="button">Heureka</button><button class="button-reset" type="button">History</button><button class="button-reset" type="button">Data quality</button></div>' +
      '<div class="workflow-panel"><strong>' + escapeHtml(humanize(product.workflowStatus)) + '</strong><p>Next action: ' + escapeHtml(humanize(product.nextAction)) + '</p><div class="listing-gaps">' + gaps + '</div></div>' +
      '<div class="catalog-preview"><strong>Catalog Heureka preview</strong><p>Status: ' + escapeHtml(profile.status || 'unknown') + '</p><p>Preview: ' + escapeHtml(previewLabel) + '</p><p>Marketplace fields: ' + escapeHtml(formatNumber(fieldCount)) + '</p>' + marketplaceReview + '</div>' +
      sourcePanel +
      '<form class="listing-form" id="listing-form">' +
      '<label>Product name<input name="title" value="' + escapeHtml(listing.title || '') + '"></label>' +
      '<label>Heureka category<input name="category" value="' + escapeHtml(listing.category || product.category || '') + '"></label>' +
      '<label>EAN<input readonly value="' + escapeHtml(listing.ean || '') + '"></label>' +
      '<div class="form-grid"><label>Brand<input readonly value="' + escapeHtml(listing.brand || '') + '"></label><label>MPN<input readonly value="' + escapeHtml(product.sku || '') + '"></label></div>' +
      '<div class="form-grid"><label>Price CZK<input name="price" type="number" min="0" step="0.01" value="' + escapeHtml(listing.price || '') + '"></label><label>Stock<input name="stockQuantity" type="number" min="0" value="' + escapeHtml(listing.stockQuantity || 0) + '"></label></div>' +
      '<label>Description (Heureka)<textarea readonly>' + escapeHtml(listing.description || '') + '</textarea></label>' +
      '<label class="check-row"><span>Include in feed</span><input name="includeInFeed" type="checkbox" ' + (product.isIncluded ? 'checked' : '') + '></label>' +
      '<label class="check-row"><span>Active listing</span><input name="isActive" type="checkbox" ' + (listing.isActive !== false ? 'checked' : '') + '></label>' +
      '<button class="primary-button button-reset" type="submit">Save changes</button>' +
      '</form>';
    var resaleToggle = panel.querySelector('[data-resale-toggle]');
    if (resaleToggle) {
      resaleToggle.addEventListener('change', function (event) {
        var input = event.currentTarget;
        var status = document.getElementById('resale-toggle-status');
        input.disabled = true;
        if (status) status.textContent = 'Saving resale sharing in Catalog';
        api('/heureka/dashboard/products/' + encodeURIComponent(product.id) + '/resale', {
          method: 'PUT',
          body: { resaleEnabled: input.checked }
        }).then(function (payload) {
          if (status) status.textContent = input.checked ? 'Product is shared for community resale.' : 'Product is private in Catalog resale.';
          renderProductDetail(payload.data || product);
        }).catch(function (error) {
          input.checked = !input.checked;
          showDashboardError(error);
          if (status) status.textContent = 'Catalog owner guard rejected the resale update.';
        }).finally(function () {
          input.disabled = false;
        });
      });
    }

    document.getElementById('listing-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      api('/heureka/dashboard/products/' + encodeURIComponent(product.id) + '/listing', {
        method: 'PUT',
        body: {
          title: form.title.value,
          price: Number(form.price.value),
          stockQuantity: Number(form.stockQuantity.value),
          category: form.category.value,
          includeInFeed: form.includeInFeed.checked,
          isActive: form.isActive.checked
        }
      }).then(loadDashboardData).catch(showDashboardError);
    });
  }

  function loadProductDetail(productId) {
    return api('/heureka/dashboard/products/' + encodeURIComponent(productId))
      .then(function (payload) { renderProductDetail(payload.data); })
      .catch(showDashboardError);
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return text(value);
    return date.toLocaleString('cs-CZ');
  }

  var ORDER_STATUS_POLL_MS = 30000;
  var ordersPollTimer = null;
  var ordersLoading = false;
  var selectedOrderId = null;

  function dashboardRouteKey() {
    var path = window.location.pathname;
    return path.indexOf('/dashboard/admin') === 0 ? 'admin'
      : (path.indexOf('/dashboard/orders') === 0 ? 'orders'
      : (path.indexOf('/dashboard/operations') === 0 ? 'operations'
      : (path.indexOf('/dashboard/settings') === 0 ? 'settings'
      : (path === '/dashboard' || path.indexOf('/dashboard/feed') === 0 ? 'feed' : 'products'))));
  }

  function routeOrderId() {
    var match = window.location.pathname.match(/^\\/dashboard\\/orders\\/([^\\/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function isOrdersRouteVisible() {
    return dashboardRouteKey() === 'orders' && !document.hidden;
  }

  function stopOrdersPolling() {
    if (ordersPollTimer) window.clearTimeout(ordersPollTimer);
    ordersPollTimer = null;
  }

  function scheduleOrdersPolling() {
    stopOrdersPolling();
    if (!isOrdersRouteVisible()) return;
    ordersPollTimer = window.setTimeout(function () {
      refreshOrdersStatus({ polling: true });
    }, ORDER_STATUS_POLL_MS);
  }

  function renderOrders(data) {
    var body = document.getElementById('orders-table-body');
    var count = document.getElementById('orders-count');
    var metrics = document.getElementById('orders-metrics');
    if (count) count.textContent = formatNumber(data.total || 0) + ' Heureka orders';
    if (metrics) {
      var counts = data.statusCounts || {};
      var centralCounts = data.centralStatusCounts || {};
      metrics.innerHTML = [
        ['Central available', centralCounts.available || 0, 'Orders lifecycle read'],
        ['Stale/unknown', centralCounts.stale || 0, 'Needs Orders readback'],
        ['Missing central ID', centralCounts.missingId || 0, 'Forwarding repair needed'],
        ['Forwarded', counts.forwarded || 0, 'Local forwarding flag'],
        ['Local failed', counts.failed || 0, 'Heureka-side failure']
      ].map(function (item) {
        return '<article class="dash-metric"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(formatNumber(item[1])) + '</strong><p>' + escapeHtml(item[2]) + '</p></article>';
      }).join('');
    }
    if (!body) return;
    body.innerHTML = (data.orders || []).map(function (order) {
      var lifecycle = order.centralLifecycle || {};
      var lifecycleStatus = lifecycle.status || order.lifecycleStatus || 'unknown';
      var lifecycleStage = lifecycle.stage && lifecycle.stage !== lifecycleStatus ? lifecycle.stage : '';
      var missing = (lifecycle.missing || []).join(', ');
      var lifecycleDetail = [
        lifecycleStage ? 'Stage: ' + humanize(lifecycleStage) : '',
        lifecycle.stale ? 'Read model: stale' : '',
        missing
      ].filter(Boolean).join(' · ');
      var centralId = order.orderId || lifecycle.centralOrderId || '';
      var forwardingState = lifecycle.state === 'missing_id' ? 'missing_id' : (order.forwarded ? 'forwarded' : 'local');
      var selected = selectedOrderId && selectedOrderId === order.id;
      return '<tr data-order-id="' + escapeHtml(order.id) + '" class="' + (selected ? 'is-selected' : '') + '"><td>' + escapeHtml(order.externalOrderId || '') + '</td><td>' + escapeHtml(centralId) + '</td><td>' + escapeHtml(order.customerEmail || order.customerPhone || '') + '</td><td>' + escapeHtml(formatNumber(order.total || 0)) + ' ' + escapeHtml(order.currency || 'CZK') + '</td><td>' + statusChip(lifecycleStatus) + (lifecycleDetail ? '<p class="table-subtext">' + escapeHtml(lifecycleDetail) + '</p>' : '') + '</td><td>' + statusChip(order.localStatus || 'unknown') + '</td><td>' + statusChip(forwardingState) + '</td><td>' + escapeHtml(formatDate(order.createdAt)) + '</td><td><button class="table-action button-reset" type="button" data-order-detail="' + escapeHtml(order.id) + '">View</button></td></tr>';
    }).join('') || '<tr><td colspan="9">No Heureka orders found</td></tr>';
    Array.prototype.forEach.call(document.querySelectorAll('[data-order-detail]'), function (button) {
      button.addEventListener('click', function () {
        loadOrderDetail(button.getAttribute('data-order-detail'), { pushState: true });
      });
    });
  }

  function renderOrderDetail(order) {
    var panel = document.getElementById('order-detail-panel');
    if (!panel) return;
    if (!order) {
      panel.innerHTML = '<div class="dashboard-notice">Select an order to inspect central lifecycle, payment and delivery status.</div>';
      return;
    }
    var lifecycle = order.centralLifecycle || {};
    var lifecycleStatus = lifecycle.status || order.lifecycleStatus || order.status || 'unknown';
    var lifecycleStage = lifecycle.stage || order.lifecycleStage || 'unknown';
    var delivery = lifecycle.reservationStatus || lifecycle.warehouseHandoffStatus || 'unknown';
    var payment = lifecycle.paymentStatus || lifecycle.paymentState || lifecycleStatus;
    var missing = lifecycle.missing || [];
    panel.innerHTML = '<div class="order-detail-head"><div><span>Order detail</span><strong>' + escapeHtml(order.externalOrderId || order.id || '') + '</strong></div>' + statusChip(lifecycleStatus) + '</div>' +
      '<dl class="order-detail-list">' +
        '<div><dt>Central order</dt><dd>' + escapeHtml(order.orderId || lifecycle.centralOrderId || '[MISSING: central Orders id]') + '</dd></div>' +
        '<div><dt>Lifecycle stage</dt><dd>' + escapeHtml(humanize(lifecycleStage)) + '</dd></div>' +
        '<div><dt>Payment status</dt><dd>' + escapeHtml(humanize(payment)) + '</dd></div>' +
        '<div><dt>Delivery status</dt><dd>' + escapeHtml(humanize(delivery)) + '</dd></div>' +
        '<div><dt>Local Heureka status</dt><dd>' + escapeHtml(humanize(order.localStatus || 'unknown')) + '</dd></div>' +
        '<div><dt>Last central read</dt><dd>' + escapeHtml(formatDate(lifecycle.readAt)) + '</dd></div>' +
      '</dl>' +
      (missing.length ? '<div class="dashboard-notice"><strong>Lifecycle blockers</strong><p>' + escapeHtml(missing.join(', ')) + '</p></div>' : '');
    Array.prototype.forEach.call(document.querySelectorAll('[data-order-id]'), function (row) {
      row.classList.toggle('is-selected', row.getAttribute('data-order-id') === order.id);
    });
  }

  function loadOrderDetail(orderId, options) {
    if (!orderId) {
      selectedOrderId = null;
      renderOrderDetail(null);
      return Promise.resolve();
    }
    selectedOrderId = orderId;
    if (options && options.pushState && window.history && window.history.pushState) {
      window.history.pushState({}, '', '/dashboard/orders/' + encodeURIComponent(orderId));
    }
    return api('/heureka/dashboard/orders/' + encodeURIComponent(orderId))
      .then(function (payload) { renderOrderDetail(payload.data); })
      .catch(showDashboardError);
  }

  function renderOperationEvents(data) {
    var body = document.getElementById('operation-events-body');
    var missing = document.getElementById('operation-events-missing');
    if (body) {
      body.innerHTML = (data.operationEvents || []).map(function (event) {
        return '<tr><td>' + escapeHtml(formatDate(event.timestamp)) + '</td><td>' + escapeHtml(humanize(event.eventType)) + '</td><td>' + escapeHtml(event.source || '') + '</td><td>' + statusChip(event.status) + '</td><td>' + escapeHtml(event.summary || '') + '</td></tr>';
      }).join('') || '<tr><td colspan="5">No operation events found</td></tr>';
    }
    if (missing) {
      var missingItems = data.missing || [];
      missing.innerHTML = '<strong>Audit contract status</strong><p>' + escapeHtml(missingItems.join(', ') || 'Durable Heureka operation events active') + '</p>';
    }
  }

  function renderReadinessLanes(data) {
    var lanesBody = document.getElementById('readiness-lanes-body');
    var missing = document.getElementById('readiness-lanes-missing');
    var productsBody = document.getElementById('readiness-blocked-products-body');
    var lanes = data.lanes || {};
    var laneRows = [
      ['Stock', lanes.stock],
      ['Media', lanes.media],
      ['Catalog content', lanes.catalogContent],
      ['Feed settings', lanes.feedSettings]
    ];
    if (lanesBody) {
      lanesBody.innerHTML = laneRows.map(function (row) {
        var lane = row[1] || {};
        return '<tr><td>' + escapeHtml(row[0]) + '</td><td>' + statusChip(lane.status || 'unknown') + '</td><td>' + escapeHtml(lane.ownerRole || '') + '</td><td>' + escapeHtml(formatNumber(lane.productCount || 0)) + '</td><td>' + escapeHtml(humanize(lane.nextAction || 'monitor')) + '</td></tr>';
      }).join('');
    }
    if (missing) {
      var blockers = laneRows.reduce(function (acc, row) {
        var lane = row[1] || {};
        return acc.concat(lane.blockers || []);
      }, []);
      var summary = data.readiness && data.readiness.summary ? data.readiness.summary : {};
      missing.innerHTML = '<strong>Readiness lanes</strong><p>' + escapeHtml(formatNumber(summary.ready || 0)) + ' ready, ' + escapeHtml(formatNumber(summary.blocked || 0)) + ' blocked. ' + escapeHtml(blockers.join(', ') || 'No current blocker lanes') + '</p>';
    }
    if (productsBody) {
      productsBody.innerHTML = (data.blockedProducts || []).slice(0, 25).map(function (product) {
        return '<tr><td><strong>' + escapeHtml(product.name || product.productId || '') + '</strong><p class="table-subtext">' + escapeHtml(product.productId || '') + '</p></td><td>' + escapeHtml(product.sku || '') + '</td><td>' + statusChip(product.readiness || 'unknown') + '</td><td>' + escapeHtml((product.blockerCodes || []).join(', ')) + '</td><td>' + escapeHtml(humanize(product.nextAction || 'monitor')) + '</td></tr>';
      }).join('') || '<tr><td colspan="5">No blocked products</td></tr>';
    }
  }

  function renderOperations(data) {
    var metrics = document.getElementById('operations-metrics');
    var body = document.getElementById('feed-history-body');
    var runtime = document.getElementById('runtime-status');
    var summary = data.summary || {};
    if (metrics) {
      metrics.innerHTML = [
        ['Feed status', (data.feedStatus && data.feedStatus.status) || 'unknown', 'Current lifecycle state'],
        ['Included', summary.includedProducts || 0, 'Products in feed'],
        ['Needs data', summary.needsData || 0, 'Catalog blockers'],
        ['Orders', summary.orderCount || 0, 'Tracked locally']
      ].map(function (item) {
        return '<article class="dash-metric"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong><p>' + escapeHtml(item[2]) + '</p></article>';
      }).join('');
    }
    if (body) {
      body.innerHTML = (data.feedHistory || []).map(function (feed) {
        return '<tr><td>' + escapeHtml(feed.feedType || '') + '</td><td>' + statusChip(feed.status) + '</td><td>' + escapeHtml(formatNumber(feed.productCount || 0)) + '</td><td>' + escapeHtml(formatDate(feed.generatedAt || feed.createdAt)) + '</td><td>' + escapeHtml(feed.feedUrl || '') + '</td></tr>';
      }).join('') || '<tr><td colspan="5">No feed generation history</td></tr>';
    }
    if (runtime) {
      var rt = data.runtime || {};
      runtime.innerHTML = '<strong>Runtime</strong><p>Feed: ' + escapeHtml(rt.feedUrl || '') + '</p><p>Auth: ' + escapeHtml(rt.authServiceUrl || '') + '</p><p>Catalog: ' + escapeHtml(rt.catalogServiceUrl || '') + '</p><p>Logging: ' + escapeHtml(rt.loggingConfigured ? 'configured' : 'missing') + '</p>';
    }
  }

  function renderSettings(data) {
    var metrics = document.getElementById('settings-metrics');
    var body = document.getElementById('settings-body');
    var settings = data.settings || {};
    var runtime = data.runtime || {};
    if (metrics) {
      metrics.innerHTML = [
        ['Feed type', data.feedType || 'heureka_cz', 'Default marketplace feed'],
        ['Settings', data.settings ? 'available' : 'missing', 'Feed configuration'],
        ['Currency', settings.currency || 'CZK', 'Feed currency'],
        ['Logging', runtime.loggingConfigured ? 'configured' : 'missing', 'Logging service URL']
      ].map(function (item) {
        return '<article class="dash-metric"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong><p>' + escapeHtml(item[2]) + '</p></article>';
      }).join('');
    }
    if (body) {
      body.innerHTML = data.settings
        ? '<strong>' + escapeHtml(settings.shopName || 'Heureka shop') + '</strong><p>' + escapeHtml(settings.shopUrl || '') + '</p><p>Contact: ' + escapeHtml(settings.contactEmail || '') + '</p><p>Delivery: ' + escapeHtml(settings.deliveryDays || 0) + ' days, ' + escapeHtml(formatNumber(settings.deliveryPrice || 0)) + ' ' + escapeHtml(settings.currency || 'CZK') + '</p><p>Health: ' + escapeHtml(runtime.healthUrl || '') + '</p>'
        : '<strong>Settings missing</strong><p>' + escapeHtml((data.missing || []).join(', ')) + '</p><p>Feed generation remains gated until settings exist and are active.</p>';
    }
  }

  function loadOrdersData(options) {
    var filter = document.getElementById('orders-status-filter');
    var status = filter && filter.value ? filter.value : 'all';
    return Promise.all([
      api('/heureka/dashboard/summary'),
      api('/heureka/dashboard/orders-list?limit=50&status=' + encodeURIComponent(status))
    ]).then(function (results) {
      renderMetrics(results[0].data);
      renderOrders(results[1].data);
      var routeId = routeOrderId();
      if (routeId) selectedOrderId = routeId;
      if (!selectedOrderId && results[1].data && results[1].data.orders && results[1].data.orders[0]) {
        selectedOrderId = results[1].data.orders[0].id;
      }
      return loadOrderDetail(selectedOrderId, { pushState: false });
    }).catch(showDashboardError).finally(function () {
      if (!options || options.schedulePolling !== false) scheduleOrdersPolling();
    });
  }

  function refreshOrdersStatus(options) {
    if (!isOrdersRouteVisible() || ordersLoading) {
      scheduleOrdersPolling();
      return Promise.resolve();
    }
    ordersLoading = true;
    return loadOrdersData({ schedulePolling: false, polling: options && options.polling })
      .finally(function () {
        ordersLoading = false;
        scheduleOrdersPolling();
      });
  }

  function loadOperationsData() {
    return Promise.all([
      api('/heureka/dashboard/operations'),
      api('/heureka/dashboard/operations/history'),
      api('/heureka/dashboard/readiness/lanes')
    ]).then(function (results) {
      renderMetrics(results[0].data.summary || {});
      renderOperations(results[0].data);
      renderOperationEvents(results[1].data);
      renderReadinessLanes(results[2].data);
    }).catch(showDashboardError);
  }

  function loadSettingsData() {
    return api('/heureka/dashboard/settings')
      .then(function (payload) { renderSettings(payload.data); })
      .catch(showDashboardError);
  }

  function loadCurrentRoute() {
    var route = setActiveDashboardRoute();
    if (route !== 'orders') stopOrdersPolling();
    if (route === 'orders') return refreshOrdersStatus();
    if (route === 'operations') return loadOperationsData();
    if (route === 'settings') return loadSettingsData();
    if (route === 'admin') return loadAdminData();
    return loadDashboardData();
  }

  function loadAdminData() {
    return Promise.all([
      api('/heureka/dashboard/admin/stats'),
      api('/heureka/dashboard/admin/registered-users?limit=100&adminOnly=yes')
    ]).then(function (results) {
      var stats = results[0].data;
      var users = results[1].data;
      var metrics = document.getElementById('admin-metrics');
      var body = document.getElementById('admin-users-body');
      var count = document.getElementById('admin-count');
      if (count) count.textContent = formatNumber(users.count || 0) + ' registered Auth users';
      if (metrics) {
        var local = stats.localStats || users.localStats || {};
        var orderLifecycleStats = stats.orderLifecycleStats || {};
        var centralStats = orderLifecycleStats.centralStatusCounts || {};
        var deliveryStats = orderLifecycleStats.deliveryStats || {};
        var missingOrStale = Number(centralStats.missingId || 0) + Number(centralStats.stale || 0);
        metrics.innerHTML = [
          ['Included products', local.includedProducts || 0, 'Heureka feed'],
          ['Orders', orderLifecycleStats.totalLocalOrders || local.orders || 0, 'Tracked locally'],
          ['Central lifecycle', centralStats.available || 0, 'Orders lifecycle read'],
          ['Missing/stale lifecycle', missingOrStale, 'Needs repair or readback'],
          ['Warehouse reserved', deliveryStats.warehouseReserved || 0, 'Central delivery signal'],
          ['Delivery unknown', deliveryStats.unknownDeliverySignal || 0, 'No current delivery signal']
        ].map(function (item) {
          return '<article class="dash-metric"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(formatNumber(item[1])) + '</strong><p>' + escapeHtml(item[2]) + '</p></article>';
        }).join('');
      }
      if (body) {
        body.innerHTML = (users.users || []).map(function (user) {
          return '<tr><td>' + escapeHtml(user.email || '') + '</td><td>' + escapeHtml([user.firstName, user.lastName].filter(Boolean).join(' ') || 'Registered user') + '</td><td>' + escapeHtml(user.userType || 'user') + '</td><td>' + (user.isActive === false ? statusChip('inactive') : statusChip('active')) + '</td><td>' + (user.isVerified ? statusChip('verified') : statusChip('unverified')) + '</td></tr>';
        }).join('') || '<tr><td colspan="5">No users returned</td></tr>';
      }
    }).catch(showDashboardError);
  }

  var dashboardSearchTimer = null;

  function scheduleDashboardSearch() {
    if (dashboardSearchTimer) window.clearTimeout(dashboardSearchTimer);
    dashboardSearchTimer = window.setTimeout(loadDashboardData, 300);
  }

  function loadDashboardData() {
    var search = document.getElementById('products-search');
    var source = document.getElementById('products-source-filter');
    var feedStatus = document.getElementById('products-feed-status');
    var workflowStatus = document.getElementById('products-workflow-status');
    var gap = document.getElementById('products-gap-filter');
    var params = new URLSearchParams({ limit: '20' });
    if (search && search.value.trim()) params.set('search', search.value.trim());
    if (source && source.value) params.set('source', source.value);
    if (feedStatus && feedStatus.value) params.set('feedStatus', feedStatus.value);
    if (workflowStatus && workflowStatus.value) params.set('workflowStatus', workflowStatus.value);
    if (gap && gap.value) params.set('gap', gap.value);
    return Promise.all([
      api('/heureka/dashboard/summary'),
      api('/heureka/dashboard/catalog-products?' + params.toString())
    ]).then(function (results) {
      renderMetrics(results[0].data);
      renderProducts(results[1].data.products || [], results[1].data.pagination || {}, results[1].data || {});
    }).catch(showDashboardError);
  }

  function showDashboardError(error) {
    var panel = document.getElementById('listing-panel');
    if (panel) panel.innerHTML = '<div class="dashboard-notice">' + escapeHtml(error.message || error) + '</div>';
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
    var refresh = document.getElementById('dashboard-refresh');
    if (refresh) refresh.addEventListener('click', loadCurrentRoute);
    var searchButton = document.getElementById('products-search-button');
    if (searchButton) searchButton.addEventListener('click', loadDashboardData);
    var searchInput = document.getElementById('products-search');
    if (searchInput) {
      searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          loadDashboardData();
        }
      });
      searchInput.addEventListener('input', scheduleDashboardSearch);
    }
    var bulkPreview = document.getElementById('bulk-readiness-preview');
    if (bulkPreview) bulkPreview.addEventListener('click', previewSelectedReadiness);
    ['products-source-filter', 'products-feed-status', 'products-workflow-status', 'products-gap-filter'].forEach(function (id) {
      var filter = document.getElementById(id);
      if (filter) filter.addEventListener('change', loadDashboardData);
    });
    var ordersStatus = document.getElementById('orders-status-filter');
    if (ordersStatus) ordersStatus.addEventListener('change', function () { refreshOrdersStatus(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopOrdersPolling();
      else if (dashboardRouteKey() === 'orders') refreshOrdersStatus();
    });
    window.addEventListener('popstate', loadCurrentRoute);
    var regenerate = document.getElementById('regenerate-feed');
    if (regenerate) {
      regenerate.addEventListener('click', function () {
        regenerate.disabled = true;
        regenerate.textContent = 'Regenerating';
        api('/heureka/dashboard/feed/regenerate', { method: 'POST', body: { feedType: 'heureka_cz' } })
          .then(loadDashboardData)
          .catch(showDashboardError)
          .finally(function () {
            regenerate.disabled = false;
            regenerate.textContent = 'Regenerate feed';
          });
      });
    }
    var operationsRegenerate = document.getElementById('operations-regenerate-feed');
    if (operationsRegenerate) {
      operationsRegenerate.addEventListener('click', function () {
        operationsRegenerate.disabled = true;
        operationsRegenerate.textContent = 'Regenerating';
        api('/heureka/dashboard/feed/regenerate', { method: 'POST', body: { feedType: 'heureka_cz' } })
          .then(loadOperationsData)
          .catch(showDashboardError)
          .finally(function () {
            operationsRegenerate.disabled = false;
            operationsRegenerate.textContent = 'Regenerate feed';
          });
      });
    }
    api('/heureka/dashboard/me').then(function (payload) {
      var user = payload.data || {};
      var userEl = document.getElementById('dashboard-user');
      var adminLink = document.getElementById('admin-link');
      if (userEl) userEl.textContent = user.email || 'Authenticated user';
      if (adminLink) adminLink.hidden = !user.isAdmin;
      var adminUsersLink = document.getElementById('admin-users-link');
      if (adminUsersLink) adminUsersLink.hidden = !user.isAdmin;
      var route = setActiveDashboardRoute();
      if (route === 'admin' && !user.isAdmin) {
        showDashboardError(new Error('Admin access required'));
        return;
      }
      loadCurrentRoute();
    }).catch(function () {
      window.localStorage.removeItem('accessToken');
      window.location.replace('/login?return_to=/dashboard');
    });
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
.dashboard-app {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  min-height: 100vh;
  background: #f7f9fb;
  color: #111827;
}
.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 18px 8px 16px;
  background: #fff;
  border-right: 1px solid #d9e0e7;
}
.dashboard-logo {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 22px 12px;
  border-bottom: 1px solid #d9e0e7;
  color: #00849a;
  font-size: 29px;
  font-weight: 900;
  letter-spacing: 0;
}
.dashboard-logo strong { color: #ff6b00; }
.dashboard-nav { display: grid; gap: 4px; }
.dashboard-nav a {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-radius: 6px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 750;
}
.dashboard-nav a.nav-child {
  min-height: 36px;
  margin-left: 38px;
  padding: 0 12px;
  color: #334155;
  font-weight: 650;
}
.dashboard-nav a:hover, .dashboard-nav a.active { background: #e8f4f6; color: #006f80; }
.nav-icon svg, .metric-icon svg, .icon-button svg, .products-toolbar-actions svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.dashboard-sidebar-foot { margin-top: auto; display: grid; gap: 10px; padding: 0 12px; color: #64748b; font-size: 12px; }
.dashboard-sidebar-foot span { display: flex; align-items: center; gap: 6px; }
.sidebar-collapse { min-height: 28px; text-align: left; color: #334155; font-size: 12px; border: 0; background: transparent; padding: 0; cursor: pointer; }
.dashboard-shell { min-width: 0; display: grid; grid-template-rows: 64px minmax(0, 1fr); }
.dashboard-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #d9e0e7;
}
.dashboard-topbar h1 { font-size: 16px; line-height: 1; margin: 0; font-weight: 850; }
.topbar-status { display: flex; align-items: center; gap: 16px; color: #475569; font-size: 13px; }
.topbar-status > span { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.icon-button { width: 34px; height: 34px; display: inline-grid; place-items: center; border: 0; border-left: 1px solid #e2e8f0; color: #334155; background: transparent; cursor: pointer; }
.user-avatar { width: 34px; height: 34px; border-radius: 50%; justify-content: center; background: #e2e8f0; color: #334155; font-weight: 850; }
.dashboard-user-name { max-width: 190px; overflow: hidden; text-overflow: ellipsis; }
.dashboard-workspace { min-width: 0; padding: 18px 24px 20px; }
.feed-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef2f7;
  color: #334155;
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
}
.status-published, .status-included, .status-ready, .status-active, .status-verified, .quality-good {
  background: #dcfce7;
  color: #166534;
}
.status-needs-data, .status-unverified, .status-unknown, .status-stale, .status-missing-id, .quality-warn {
  background: #fef3c7;
  color: #92400e;
}
.status-not-published, .status-excluded, .status-inactive, .quality-bad {
  background: #fee2e2;
  color: #991b1b;
}
.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(138px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}
.dash-metric {
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid #d9e0e7;
  border-radius: 3px;
  background: #fff;
}
.metric-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: #e6f7f8; color: #00849a; flex: 0 0 auto; }
.dash-metric:nth-child(2) .metric-icon, .dash-metric:nth-child(3) .metric-icon { background: #e8f8ec; color: #1f9d45; }
.dash-metric:nth-child(4) .metric-icon { background: #fff4df; color: #d97706; }
.dash-metric:nth-child(5) .metric-icon { background: #e6f7f8; color: #00849a; }
.dash-metric span:not(.metric-icon) { color: #64748b; font-size: 12px; font-weight: 800; }
.dash-metric strong { display: block; margin-top: 5px; font-size: 22px; line-height: 1; }
.dash-metric p { margin: 5px 0 0; color: #64748b; font-size: 12px; }
.dashboard-products {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(380px, 430px);
  gap: 0;
}
.products-table-panel, .listing-panel, .admin-panel {
  border: 1px solid #d9e0e7;
  border-radius: 3px;
  background: #fff;
}
.products-table-panel { border-right: 0; }
.orders-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
.orders-table-panel { min-width: 0; }
.order-detail-panel { min-height: 260px; padding: 18px; border: 1px solid #d9e0e7; border-radius: 3px; background: #fff; }
.order-detail-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
.order-detail-head span { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; }
.order-detail-head strong { display: block; margin-top: 4px; word-break: break-word; }
.order-detail-list { display: grid; gap: 12px; margin: 0 0 16px; }
.order-detail-list div { display: grid; gap: 4px; }
.order-detail-list dt { color: #64748b; font-size: 12px; }
.order-detail-list dd { margin: 0; font-weight: 700; word-break: break-word; }
.dashboard-table tr.is-selected td { background: #eef6ff; }
.products-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  flex-wrap: wrap;
}
.products-toolbar h2 { font-size: 18px; margin-bottom: 4px; }
.products-toolbar p { margin: 0; color: #64748b; }
.products-toolbar-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; margin-left: auto; }
.products-toolbar-actions .button-reset svg { width: 16px; height: 16px; margin-right: 7px; vertical-align: -3px; }
.products-toolbar-actions .catalog-link svg { width: 16px; height: 16px; margin-left: 7px; vertical-align: -3px; }
.catalog-source-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 18px 14px;
  color: #475569;
  flex-wrap: wrap;
}
.catalog-source-strip strong { display: block; color: var(--ink); font-size: 13px; margin-bottom: 3px; }
.catalog-source-strip span { font-size: 12px; }
.catalog-source-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.catalog-source-actions a { color: #007c8c; font-size: 12px; font-weight: 850; text-decoration: none; }
.products-filter {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(4, minmax(130px, 0.7fr)) auto;
  gap: 12px;
  padding: 0 18px 14px;
}
.products-filter input, .products-filter select, .listing-form input, .listing-form textarea, .listing-form select {
  width: 100%;
  border: 1px solid #cfd8e3;
  border-radius: 3px;
  padding: 9px 10px;
  font: inherit;
  background: #fff;
}
.bulk-row { min-height: 42px; display: flex; align-items: center; gap: 14px; padding: 8px 18px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 12px; flex-wrap: wrap; }
#bulk-readiness-summary { color: #334155; font-weight: 750; }
.table-scroll { overflow-x: auto; }
.dashboard-table { width: 100%; border-collapse: collapse; min-width: 940px; }
.dashboard-table th, .dashboard-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: middle; }
.dashboard-table th { color: #64748b; background: #f8fafc; font-size: 11px; font-weight: 900; }
.product-cell { display: flex; align-items: center; gap: 10px; min-width: 240px; }
.product-cell p, .table-subtext { margin: 3px 0 0; color: var(--muted); font-size: 12px; }
.product-thumb { width: 34px; height: 34px; border-radius: 3px; background: #e5edf2; border: 1px solid #d9e0e7; object-fit: cover; flex: 0 0 auto; }
.product-thumb.large { width: 54px; height: 54px; }
.table-action { border: 0; background: transparent; color: #334155; font-size: 22px; font-weight: 900; cursor: pointer; }
.source-chip { display: inline-flex; align-items: center; min-height: 24px; padding: 3px 8px; border-radius: 999px; background: #eef6f8; color: #0f6b78; font-size: 11px; font-weight: 900; white-space: nowrap; }
.source-own { background: #e8f8ec; color: #146c2e; }
.source-alfares { background: #e6f7f8; color: #007c8c; }
.source-community { background: #fff4df; color: #a45603; }
.listing-panel { min-height: 620px; padding: 18px; border-left: 1px solid #d9e0e7; }
.listing-head { display: flex; gap: 12px; align-items: center; padding-bottom: 16px; }
.listing-head h3 { margin-bottom: 4px; font-size: 16px; }
.listing-head p { margin: 0; color: #64748b; }
.listing-tabs { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid #d9e0e7; margin: 0 -18px 16px; }
.listing-tabs button { min-height: 42px; border: 0; background: transparent; color: #475569; font-weight: 800; cursor: pointer; }
.listing-tabs button.active { color: #007c8c; box-shadow: inset 0 -2px 0 #007c8c; }
.listing-form { display: grid; gap: 12px; padding-top: 0; }
.listing-form label { display: grid; gap: 6px; color: #64748b; font-size: 12px; font-weight: 850; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.listing-form textarea { min-height: 116px; resize: vertical; }
.check-row { display: flex !important; flex-direction: row; align-items: center; justify-content: space-between; color: var(--ink) !important; }
.check-row input { width: 22px; height: 22px; }
.listing-gaps { display: flex; flex-wrap: wrap; gap: 8px; }
.workflow-panel, .catalog-preview, .catalog-source-card { border: 1px solid #d9e0e7; border-radius: 4px; padding: 12px; margin-bottom: 12px; background: #f8fafc; }
.operations-timeline, .readiness-lanes { margin-top: 16px; }
.workflow-panel strong, .catalog-preview strong, .catalog-source-card strong { display: block; margin-bottom: 4px; }
.workflow-panel p, .catalog-preview p, .catalog-source-card p { margin: 4px 0; color: #64748b; font-size: 12px; }
.catalog-review-warning { color: #92400e !important; font-weight: 800; }
.dashboard-notice { border: 1px solid #f59f00; background: #fffbeb; color: #92400e; border-radius: 8px; padding: 12px; }
.admin-panel { padding-bottom: 16px; }
.dashboard-products[hidden], .admin-panel[hidden] { display: none !important; }
@media (max-width: 1380px) {
  .dashboard-products { grid-template-columns: minmax(0, 1fr) 380px; }
  .products-toolbar-actions .primary-button { display: none; }
  .products-filter { grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(150px, .7fr)); }
  .products-filter select:nth-of-type(4) { display: none; }
}
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
  .dashboard-app, .dashboard-products { grid-template-columns: 1fr; }
  .dashboard-sidebar { border-right: 0; border-bottom: 1px solid var(--line); }
  .dashboard-metrics { grid-template-columns: repeat(2, minmax(150px, 1fr)); }
  .products-filter input { width: 100%; }
}
@media (max-width: 720px) {
  .header-inner, .hero-inner, .process-section, .control-section, .benefits-section, .auth-section { padding-left: 20px; padding-right: 20px; }
  .brand { font-size: 24px; }
  .nav { display: none; }
  .header-actions, .hero-actions { width: 100%; }
  .header-actions, .hero-actions { flex-direction: column; align-items: stretch; }
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
  .dashboard-shell { grid-template-rows: auto minmax(0, 1fr); }
  .dashboard-topbar { align-items: flex-start; flex-direction: column; padding: 14px 20px; }
  .topbar-status { width: 100%; flex-wrap: wrap; gap: 10px; }
  .dashboard-workspace { padding: 14px; }
  .dashboard-metrics { grid-template-columns: 1fr; }
  .products-toolbar, .dashboard-topline, .products-filter { flex-direction: column; align-items: stretch; }
  .dashboard-actions { justify-content: stretch; }
  .orders-workspace { grid-template-columns: 1fr; }
  .dashboard-actions .primary-button, .dashboard-actions .secondary-button { width: 100%; }
}`;
  }
}
