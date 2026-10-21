// Les actions rapides (lot G6) : des prompts prets a l'emploi qui visent l'element choisi, a copier dans l'outil
// d'IA. Brief valide par Pierre-Alain le 21 octobre 2026. Ce qu'on lit est exactement ce qui est copie ; la seule
// commande de chaque carte est <gdc-copy-button> : jamais d'envoi, jamais de lien.

export const meta = {
  id: "quick-actions",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-quick-actions",
  inputs: ["id", "actions"],
  outputs: ["gdc-copy"],
};

const texte = (v) => (v === undefined || v === null ? "" : String(v).trim());

const CSS = `
:host { display: block; font: 14px/1.4 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
li { padding: 8px 6px 10px 12px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); border-radius: 8px; background: var(--gdc-surface); }
.tete { display: flex; align-items: center; gap: 8px; }
.libelle { flex: 1 1 auto; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
gdc-copy-button { flex: none; }
.prompt { margin: 4px 6px 0 0; padding: 6px 8px; border-radius: 6px; background: var(--gdc-background); color: var(--gdc-ink);
  border-left: 3px solid color-mix(in srgb, var(--gdc-ink) 25%, transparent); white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; }
.vide { margin: 0; color: var(--gdc-muted); }
`;

export function define(registry) {
  class QuickActions extends HTMLElement {
    #data = {};
    #racine;

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      this.#racine = document.createElement("div");
      root.append(style, this.#racine);
      this.#render();
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#render();
    }

    #render() {
      const id = texte(this.#data.id);
      const actions = Array.isArray(this.#data.actions)
        ? this.#data.actions.filter((a) => a && texte(a.prompt))
        : [];
      if (!id || !actions.length) {
        const p = document.createElement("p");
        p.className = "vide";
        p.textContent = !id
          ? "Aucun élément choisi"
          : "Aucune action rapide pour cet élément";
        this.#racine.replaceChildren(p);
        return;
      }
      const ul = document.createElement("ul");
      ul.setAttribute("aria-label", "Actions rapides");
      for (const a of actions) {
        const prompt = texte(a.prompt);
        // le prompt cite toujours l'identifiant ; le texte affiche est celui qui sera copie, a la lettre
        const final = prompt.includes(id) ? prompt : `${prompt} (${id})`;
        const li = document.createElement("li");
        const tete = document.createElement("div");
        tete.className = "tete";
        const libelle = document.createElement("span");
        libelle.className = "libelle";
        libelle.textContent = texte(a.label) || "Action";
        const copie = document.createElement("gdc-copy-button");
        copie.data = { id, text: final };
        tete.append(libelle, copie);
        const p = document.createElement("p");
        p.className = "prompt";
        p.textContent = final;
        li.append(tete, p);
        ul.append(li);
      }
      this.#racine.replaceChildren(ul);
    }
  }

  registry.define(meta.tag, QuickActions);
}
