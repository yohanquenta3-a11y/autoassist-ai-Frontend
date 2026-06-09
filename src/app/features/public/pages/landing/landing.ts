import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroSection } from '../../components/hero-section/hero-section';
import { FeaturesSection } from '../../components/features-section/features-section';
import { DownloadCta } from '../../components/download-cta/download-cta';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HeroSection, FeaturesSection, DownloadCta, RouterLink],
  template: `
    <div class="landing-page">
      <header class="public-header">
        <div class="logo">
          <div class="logo-icon">AA</div>
          <div class="brand-copy">
            <span>AutoAssist AI</span>
            <small>Asistencia inteligente para carretera</small>
          </div>
        </div>
        <nav class="nav-links">
          <a href="#capacidades" class="nav-link">Capacidades</a>
          <a href="#ecosistema" class="nav-link">Ecosistema</a>
          <a routerLink="/identity/auth" class="login-link">Acceso a Talleres</a>
        </nav>
      </header>

      <main>
        <app-hero-section></app-hero-section>

        <section class="trust-strip">
          <div class="trust-card">
            <strong>Respuesta operativa</strong>
            <span>Incidentes, asignacion y seguimiento en una sola vista.</span>
          </div>
          <div class="trust-card">
            <strong>Marca nueva</strong>
            <span>AutoAssist AI reemplaza por completo la identidad anterior.</span>
          </div>
          <div class="trust-card">
            <strong>Experiencia conectada</strong>
            <span>Web para gestion, movil para carretera y soporte tecnico.</span>
          </div>
        </section>

        <div id="capacidades">
          <app-features-section></app-features-section>
        </div>

        <section class="operations-showcase" id="ecosistema">
          <article class="showcase-copy">
            <p class="showcase-kicker">Centro operativo</p>
            <h2>Una presencia visual distinta para clientes, talleres y tecnicos</h2>
            <p>
              El rediseño de AutoAssist AI separa la experiencia publica del sistema
              interno con una interfaz mas sobria, paneles oscuros, acentos cobre y
              mensajes mas claros para cada flujo.
            </p>

            <div class="showcase-points">
              <div class="showcase-point">
                <strong>Monitoreo en tiempo real</strong>
                <span>Estado del incidente, respuesta IA y avance del tecnico.</span>
              </div>
              <div class="showcase-point">
                <strong>Operacion comercial</strong>
                <span>Cotizaciones, pagos y seguimiento sin duplicar pantallas.</span>
              </div>
              <div class="showcase-point">
                <strong>Experiencia consistente</strong>
                <span>Mismo lenguaje visual entre landing, panel y aplicacion movil.</span>
              </div>
            </div>
          </article>

          <article class="showcase-panel">
            <div class="showcase-surface">
              <div class="surface-top">
                <span class="surface-chip">AutoAssist AI</span>
                <span class="surface-chip muted">Operacion en linea</span>
              </div>

              <div class="surface-grid">
                <div class="surface-metric">
                  <strong>24/7</strong>
                  <span>Atencion continua</span>
                </div>
                <div class="surface-metric">
                  <strong>IA</strong>
                  <span>Analisis inicial del caso</span>
                </div>
                <div class="surface-metric">
                  <strong>Web + App</strong>
                  <span>Gestion sincronizada</span>
                </div>
                <div class="surface-metric">
                  <strong>Taller</strong>
                  <span>Seguimiento centralizado</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <app-download-cta></app-download-cta>
      </main>

      <footer class="public-footer">
        <div class="footer-content">
          <div class="footer-brand">
            <div class="logo-icon">AA</div>
            <span>AutoAssist AI</span>
          </div>
          <p class="copyright">&copy; 2026 AutoAssist AI. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(circle at top, rgba(255, 150, 26, 0.12), transparent 30%),
        linear-gradient(180deg, #07090f 0%, #0c1018 50%, #090c12 100%);
      color: var(--sm-color-text-main);
    }

    .public-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.25rem 0;
      max-width: 1240px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      position: relative;
      z-index: 2;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .logo-icon {
      width: 2.9rem;
      height: 2.9rem;
      border-radius: 0.95rem;
      background:
        radial-gradient(circle at 35% 35%, rgba(255, 213, 122, 0.4), transparent 35%),
        linear-gradient(135deg, #ffb347, #ff7a18);
      color: var(--sm-color-white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      font-weight: 800;
      box-shadow:
        0 12px 28px rgba(255, 122, 24, 0.28),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
    }

    .brand-copy {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .brand-copy span {
      font-weight: 800;
      font-size: 1.12rem;
      color: var(--sm-color-text-title);
      letter-spacing: 0.02em;
    }

    .brand-copy small {
      color: var(--sm-color-text-muted);
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .nav-link {
      color: var(--sm-color-text-soft);
      text-decoration: none;
      font-weight: 600;
      padding: 0.6rem 0.9rem;
      border-radius: 999px;
      transition: all 0.2s ease;

      &:hover {
        color: var(--sm-color-text-title);
        background: rgba(255, 255, 255, 0.04);
      }
    }

    .login-link {
      color: #ffd18f;
      text-decoration: none;
      font-weight: 700;
      padding: 0.7rem 1.1rem;
      border: 1px solid rgba(255, 149, 36, 0.22);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.03);
      transition: all 0.2s ease;
      white-space: nowrap;

      &:hover {
        background: rgba(255, 149, 36, 0.1);
        border-color: rgba(255, 149, 36, 0.36);
        color: #fff1d7;
      }
    }

    main {
      flex: 1;
    }

    .trust-strip {
      max-width: 1240px;
      margin: -1rem auto 0;
      padding: 0 1.25rem 1rem;
      display: grid;
      gap: 1rem;

      @media (min-width: 840px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .trust-card {
      background:
        linear-gradient(180deg, rgba(15, 19, 29, 0.92), rgba(8, 11, 18, 0.98));
      border: 1px solid rgba(255, 149, 36, 0.12);
      border-radius: 22px;
      padding: 1.1rem 1.15rem;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 18px 40px rgba(0, 0, 0, 0.18);

      strong {
        display: block;
        color: var(--sm-color-text-title);
        margin-bottom: 0.35rem;
        font-size: 0.98rem;
      }

      span {
        color: var(--sm-color-text-soft);
        line-height: 1.5;
        font-size: 0.92rem;
      }
    }

    .operations-showcase {
      max-width: 1240px;
      margin: 0 auto;
      padding: 1.5rem 1.25rem 5rem;
      display: grid;
      gap: 1.5rem;

      @media (min-width: 980px) {
        grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
        align-items: stretch;
      }
    }

    .showcase-copy,
    .showcase-panel {
      min-width: 0;
    }

    .showcase-copy {
      background:
        linear-gradient(180deg, rgba(12, 16, 24, 0.94), rgba(8, 11, 18, 0.98));
      border: 1px solid rgba(255, 149, 36, 0.12);
      border-radius: 30px;
      padding: 1.6rem;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 24px 60px rgba(0, 0, 0, 0.2);

      h2 {
        margin: 0 0 1rem;
        font-size: clamp(2rem, 1.7rem + 1.2vw, 3rem);
        line-height: 1.08;
        color: var(--sm-color-text-title);
      }

      > p:last-of-type {
        color: var(--sm-color-text-soft);
        font-size: 1rem;
        line-height: 1.7;
        margin: 0;
      }
    }

    .showcase-kicker {
      margin: 0 0 0.75rem;
      color: #ffbf72;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.74rem;
      font-weight: 800;
    }

    .showcase-points {
      margin-top: 1.5rem;
      display: grid;
      gap: 0.9rem;
    }

    .showcase-point {
      padding: 1rem 1.05rem;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);

      strong {
        display: block;
        color: var(--sm-color-text-title);
        margin-bottom: 0.3rem;
      }

      span {
        color: var(--sm-color-text-soft);
        line-height: 1.5;
      }
    }

    .showcase-surface {
      height: 100%;
      min-height: 100%;
      background:
        radial-gradient(circle at top right, rgba(255, 149, 36, 0.18), transparent 35%),
        linear-gradient(180deg, rgba(15, 19, 29, 0.94), rgba(7, 10, 16, 0.99));
      border: 1px solid rgba(255, 149, 36, 0.14);
      border-radius: 30px;
      padding: 1.4rem;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 24px 60px rgba(0, 0, 0, 0.22);
    }

    .surface-top {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      margin-bottom: 1rem;
    }

    .surface-chip {
      padding: 0.45rem 0.8rem;
      border-radius: 999px;
      background: rgba(255, 149, 36, 0.12);
      border: 1px solid rgba(255, 149, 36, 0.22);
      color: #ffd18f;
      font-weight: 700;
      font-size: 0.82rem;

      &.muted {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.08);
        color: var(--sm-color-text-soft);
      }
    }

    .surface-grid {
      display: grid;
      gap: 0.9rem;

      @media (min-width: 560px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .surface-metric {
      padding: 1rem;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.07);

      strong {
        display: block;
        color: var(--sm-color-text-title);
        font-size: 1.3rem;
        margin-bottom: 0.25rem;
      }

      span {
        color: var(--sm-color-text-soft);
        line-height: 1.5;
      }
    }

    .public-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 2rem;
      background: rgba(7, 9, 15, 0.86);
      backdrop-filter: blur(18px);
    }

    .footer-content {
      max-width: 1240px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;

      @media (min-width: 768px) {
        flex-direction: row;
        justify-content: space-between;
      }
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      color: var(--sm-color-text-soft);

      .logo-icon {
        width: 1.8rem;
        height: 1.8rem;
        font-size: 0.68rem;
        border-radius: 0.55rem;
      }
    }

    .copyright {
      color: var(--sm-color-text-muted);
      font-size: 0.875rem;
      margin: 0;
    }

    @media (max-width: 720px) {
      .public-header {
        padding: 1rem 1rem 0;
        flex-direction: column;
        align-items: stretch;
      }

      .nav-links {
        width: 100%;
        justify-content: center;
      }

      .login-link,
      .nav-link {
        width: 100%;
      }

      .nav-link,
      .login-link {
        text-align: center;
      }

      .trust-strip,
      .operations-showcase {
        padding-left: 1rem;
        padding-right: 1rem;
      }

      .public-footer {
        padding: 1.5rem 1rem;
      }

      .copyright {
        text-align: center;
      }
    }
  `]
})
export class Landing {}
