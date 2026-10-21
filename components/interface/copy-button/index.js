// L'icone de copie (lot G6) : copie le nom et l'identifiant d'un element, pour le coller dans l'outil d'IA.
// Brief valide par Pierre-Alain le 21 octobre 2026. Reprise par l'inspecteur, les actions rapides et la fiche
// d'agent, qui posent cette balise au lieu de recrire la copie. La seule action : ecrire dans le presse-papiers.

export const meta = {
  id: "copy-button",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-copy-button",
  inputs: ["id", "text"],
  outputs: ["gdc-copy"],
};

const CONFIRMATION = 1500; // ms : la bulle « Copié », puis tout revient

// Le texte copie : tel quel s'il cite deja l'identifiant, sinon « texte (id) » ; l'identifiant seul sans texte.
function aCopier(id, text) {
  if (!id) return null;
  if (!text) return id;
  return text.includes(id) ? text : `${text} (${id})`;
}

const CSS = `
:host { display: inline-flex; vertical-align: middle; font: 13px/1.3 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-muted); }
* { box-sizing: border-box; }
button { display: inline-grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; background: none;
  color: inherit; cursor: pointer; }
button:hover:not(:disabled) { background: color-mix(in srgb, var(--gdc-ink) 8%, transparent); color: var(--gdc-ink); }
button:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 1px; }
button:disabled { opacity: .4; cursor: default; }
button.ok { color: var(--gdc-state-done); }
@media (pointer: coarse) { button { width: 40px; height: 40px; } }
.bulle { position: fixed; inset: auto; margin: 0; padding: 6px 10px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 18%, transparent); border-radius: 8px;
  background: var(--gdc-surface); color: var(--gdc-ink); box-shadow: 0 4px 16px rgb(0 0 0 / .18); font: inherit; max-width: min(360px, calc(100vw - 16px)); }
.bulle.copie { padding: 3px 8px; font-weight: 600; pointer-events: none;
  animation: apparait calc(var(--gdc-motion, 1) * 160ms) ease-out; }
@keyframes apparait { from { opacity: 0; transform: translateY(2px); } }
.bulle.repli p { margin: 0 0 6px; }
.bulle.repli input { width: 100%; min-width: 220px; padding: 6px 8px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 22%, transparent); border-radius: 6px;
  background: var(--gdc-background); color: var(--gdc-ink); font: 12px/1.4 var(--gdc-font-mono, ui-monospace, monospace); }
.bulle.repli input:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 1px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
`;

export function define(registry) {
  class CopyButton extends HTMLElement {
    #data = {};
    #timer = null;
    #els = {};

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const button = document.createElement("button");
      button.type = "button";
      button.append(icone("feuilles"));
      const copie = bulle("copie", "manual");
      copie.textContent = "Copié";
      copie.setAttribute("aria-hidden", "true");
      const repli = bulle("repli", "auto");
      const consigne = document.createElement("p");
      consigne.textContent = "Copie refusée : fais ⌘C ou Ctrl+C.";
      const champ = document.createElement("input");
      champ.readOnly = true;
      champ.setAttribute("aria-label", "Texte à copier");
      repli.append(consigne, champ);
      const annonce = document.createElement("span");
      annonce.className = "sr";
      annonce.setAttribute("role", "status");
      root.append(style, button, copie, repli, annonce);
      Object.assign(this.#els, { button, copie, repli, champ, annonce });

      button.addEventListener("click", () => this.#copy());
      // Echap ou un clic ailleurs fermet la bulle de repli (popover="auto") ; le focus revient sur l'icone
      repli.addEventListener("toggle", (ev) => {
        if (ev.newState === "closed") button.focus();
      });
      repli.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !repli.showPopover) {
          repli.hidden = true;
          button.focus();
        }
      });
      this.#render();
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#render();
    }

    disconnectedCallback() {
      clearTimeout(this.#timer);
      cache(this.#els.copie);
      cache(this.#els.repli);
    }

    #texte() {
      const id =
        this.#data.id != null && String(this.#data.id).trim()
          ? String(this.#data.id).trim()
          : null;
      const text =
        typeof this.#data.text === "string" && this.#data.text.trim()
          ? this.#data.text.trim()
          : null;
      return { id, copie: aCopier(id, text) };
    }

    #render() {
      const { button } = this.#els;
      const { copie } = this.#texte();
      button.disabled = !copie;
      const libelle = copie ? `Copier : ${copie}` : "Rien à copier";
      button.setAttribute("aria-label", libelle);
      button.title = libelle;
    }

    async #copy() {
      const { id, copie } = this.#texte();
      if (!copie) return;
      let ok = false;
      try {
        await navigator.clipboard.writeText(copie);
        ok = true;
      } catch {
        ok = false; // page non securisee, permission refusee, ou presse-papiers absent
      }
      if (ok) this.#confirm();
      else this.#fallback(copie);
      this.dispatchEvent(
        new CustomEvent("gdc-copy", {
          detail: { id, text: copie, ok },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #confirm() {
      const { button, copie, annonce } = this.#els;
      button.classList.add("ok");
      button.replaceChildren(icone("coche"));
      montre(copie, button, "cote");
      annonce.textContent = "Copié";
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        button.classList.remove("ok");
        button.replaceChildren(icone("feuilles"));
        cache(copie);
        annonce.textContent = "";
      }, CONFIRMATION);
    }

    #fallback(texte) {
      const { button, repli, champ, annonce } = this.#els;
      champ.value = texte;
      montre(repli, button, "dessous");
      annonce.textContent =
        "Copie refusée : le texte est sélectionné, fais Commande C ou Contrôle C";
      champ.focus();
      champ.select();
    }
  }

  // Les bulles passent au premier plan (popover) : aucun parent ne les coupe, sur un telephone non plus.
  function bulle(cls, mode) {
    const b = document.createElement("div");
    b.className = "bulle " + cls;
    if ("popover" in HTMLElement.prototype) b.popover = mode;
    else b.hidden = true;
    return b;
  }

  function montre(b, ancre, ou) {
    if (b.showPopover) {
      if (!b.matches(":popover-open")) b.showPopover();
    } else b.hidden = false;
    const r = ancre.getBoundingClientRect();
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    let left = ou === "cote" ? r.right + 4 : r.left;
    let top = ou === "cote" ? r.top + (r.height - h) / 2 : r.bottom + 6;
    left = Math.max(8, Math.min(left, innerWidth - w - 8));
    if (ou === "cote" && left < r.right) top = r.top - h - 4; // pas de place a droite : au-dessus
    top = Math.max(8, Math.min(top, innerHeight - h - 8));
    b.style.left = `${left}px`;
    b.style.top = `${top}px`;
  }

  function cache(b) {
    if (b.hidePopover) {
      if (b.matches(":popover-open")) b.hidePopover();
    } else b.hidden = true;
  }

  // Deux feuilles superposees, ou la coche de la reussite.
  function icone(nom) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    const d =
      nom === "coche"
        ? ["M3 8.6 6.4 12 13 4.6"]
        : [
            "M5.5 5.5h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z",
            "M11.5 3V2.5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1H4",
          ];
    for (const t of d) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", t);
      Object.assign(p.style, {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: nom === "coche" ? "2" : "1.4",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      });
      svg.append(p);
    }
    return svg;
  }

  registry.define(meta.tag, CopyButton);
}
