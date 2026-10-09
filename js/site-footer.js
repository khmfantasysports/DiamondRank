(() => {
  const STYLE_ID = "diamondrank-footer-component-styles";

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      diamondrank-footer {
        display: block;
      }

      .dr-site-footer {
        display: block;
        margin: 24px 0 0;
        padding: 13px 0 max(16px, env(safe-area-inset-bottom));
        border: 0;
        border-top: 1px solid var(--tan-line, rgba(200, 170, 120, .24));
        border-radius: 0;
        background: transparent;
        color: var(--muted, #9fb3a6);
      }

      .dr-site-footer-main {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        min-height: 30px;
      }

      .dr-site-footer-logo {
        display: block;
        width: 30px;
        height: 30px;
        flex: 0 0 auto;
        overflow: hidden;
        border-radius: 8px;
      }

      .dr-site-footer-logo img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .dr-site-footer-divider {
        width: 1px;
        height: 18px;
        flex: 0 0 auto;
        background: rgba(177, 224, 197, .12);
      }

      .dr-site-footer-links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-width: 0;
      }

      .dr-site-footer-links a {
        color: var(--muted, #9fb3a6);
        font-size: 9px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
        text-decoration: none;
        transition: color .15s ease;
      }

      .dr-site-footer-links a:hover,
      .dr-site-footer-links a:focus-visible {
        color: var(--tan-bright, #dec69b);
      }

      .dr-site-footer-separator {
        color: var(--muted-2, #71867a);
        font-size: 8px;
        line-height: 1;
      }

      .dr-site-footer-legal {
        margin: 10px 0 0;
        padding-top: 9px;
        border-top: 1px solid rgba(177, 224, 197, .07);
        color: var(--muted-2, #71867a);
        font-size: 7.2px;
        font-weight: 500;
        line-height: 1.4;
        text-align: center;
      }

      @media (max-width: 640px) {
        .dr-site-footer {
          margin-top: 20px;
          padding-top: 11px;
        }

        .dr-site-footer-main {
          gap: 9px;
          min-height: 28px;
        }

        .dr-site-footer-logo {
          width: 28px;
          height: 28px;
          border-radius: 7px;
        }

        .dr-site-footer-divider {
          height: 16px;
        }

        .dr-site-footer-links {
          gap: 6px;
        }

        .dr-site-footer-links a {
          font-size: 8.2px;
        }

        .dr-site-footer-separator {
          font-size: 7px;
        }

        .dr-site-footer-legal {
          margin-top: 9px;
          padding-top: 8px;
          font-size: 6.7px;
        }
      }
    `;
    document.head.append(style);
  }

  class DiamondRankFooter extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <footer class="dr-site-footer">
          <div class="dr-site-footer-main">
            <a class="dr-site-footer-logo" href="./" aria-label="DiamondRank home">
              <img
                src="./assets/diamondrank-icon-64.png"
                alt=""
                width="64"
                height="64"
              />
            </a>

            <span class="dr-site-footer-divider" aria-hidden="true"></span>

            <nav class="dr-site-footer-links" aria-label="Footer navigation">
              <a href="mailto:diamondrank.app@gmail.com" aria-label="Email DiamondRank">Contact</a>
              <span class="dr-site-footer-separator" aria-hidden="true">•</span>
              <a href="./privacy.html">Privacy</a>
              <span class="dr-site-footer-separator" aria-hidden="true">•</span>
              <a href="./terms.html">Terms</a>
            </nav>
          </div>

          <p class="dr-site-footer-legal">
            © 2026 DiamondRank · Model estimates for informational and fantasy-sports use.
          </p>
        </footer>
      `;
    }
  }

  if (!customElements.get("diamondrank-footer")) {
    customElements.define("diamondrank-footer", DiamondRankFooter);
  }
})();
