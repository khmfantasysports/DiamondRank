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
        gap: 0;
        margin: clamp(28px, 4vw, 44px) 0 0;
        padding: 15px 0 0;
        border: 0;
        border-top: 1px solid var(--tan-line, rgba(200, 170, 120, .24));
        border-radius: 0;
        background: transparent;
        color: var(--muted, #9fb3a6);
      }

      .dr-site-footer-row {
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr) 30px;
        align-items: center;
        gap: 10px;
        min-height: 30px;
        padding: 0 2px 14px;
      }

      .dr-site-footer-logo {
        display: block;
        width: 30px;
        height: 30px;
        overflow: hidden;
        border-radius: 8px;
      }

      .dr-site-footer-logo img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .dr-site-footer-links {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: nowrap;
        gap: 7px;
        min-width: 0;
        text-align: center;
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

      .dr-site-footer-balance {
        display: block;
        width: 30px;
        height: 30px;
      }

      .dr-site-footer-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 10px 2px max(18px, env(safe-area-inset-bottom));
        border-top: 1px solid rgba(177, 224, 197, .08);
        color: var(--muted-2, #71867a);
        font-size: 7.5px;
        font-weight: 500;
        line-height: 1.4;
      }

      @media (max-width: 640px) {
        .dr-site-footer {
          display: block;
          margin-top: 24px;
          padding: 13px 0 0;
        }

        .dr-site-footer-row {
          grid-template-columns: 28px minmax(0, 1fr) 28px;
          gap: 8px;
          min-height: 28px;
          padding-bottom: 12px;
        }

        .dr-site-footer-logo,
        .dr-site-footer-balance {
          width: 28px;
          height: 28px;
        }

        .dr-site-footer-logo {
          border-radius: 7px;
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

        .dr-site-footer-bottom {
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          padding: 9px 2px max(16px, env(safe-area-inset-bottom));
          font-size: 6.8px;
        }
      }
    `;
    document.head.append(style);
  }

  class DiamondRankFooter extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <footer class="dr-site-footer">
          <div class="dr-site-footer-row">
            <a class="dr-site-footer-logo" href="./" aria-label="DiamondRank home">
              <img
                src="./assets/diamondrank-icon-64.png"
                alt=""
                width="64"
                height="64"
              />
            </a>

            <nav class="dr-site-footer-links" aria-label="Footer navigation">
              <a href="mailto:diamondrank.app@gmail.com" aria-label="Email DiamondRank">Contact</a>
              <span class="dr-site-footer-separator" aria-hidden="true">•</span>
              <a href="./privacy.html">Privacy</a>
              <span class="dr-site-footer-separator" aria-hidden="true">•</span>
              <a href="./terms.html">Terms</a>
            </nav>

            <span class="dr-site-footer-balance" aria-hidden="true"></span>
          </div>

          <div class="dr-site-footer-bottom">
            <span>© 2026 DiamondRank. All rights reserved.</span>
            <span>Rankings and scores are model estimates for informational and fantasy-sports use.</span>
          </div>
        </footer>
      `;
    }
  }

  if (!customElements.get("diamondrank-footer")) {
    customElements.define("diamondrank-footer", DiamondRankFooter);
  }
})();
