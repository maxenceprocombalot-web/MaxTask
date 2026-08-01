# Primer du second cerveau — injecté au démarrage de chaque session

> Régénéré depuis Supabase `brain-max` (`lgvtjqtytwyovllsqbgv`) à chaque session.
> Dernière régénération : 01/08/2026.
>
> Ceci est une **photo**, pas la source. Pour toute question précise —
> un contact, un devis, une tâche, un souvenir daté — interroger le cerveau
> en direct via le MCP Supabase. Ce fichier sert à ne jamais démarrer à froid.

## Où en est chaque pôle

**Axiom** (`axiom-crm`, actif) — 0 client signé sur les 2 de la pierre angulaire
du 31 août ; prospection à l'arrêt. Devis IA débloqués depuis le 25/07.
Blockers : file d'approbations engorgée · relances-auto en panne depuis le 18/07 ·
relances CRM en retard · pas de RC pro · crédits API Claude coupés.
Tarifs : CRM 2 000 € (1 000 + 1 000), puis hébergement 200 €/mois **ou** évolutif
359 €/mois — jamais les deux. Site axiom-ia.fr.

**Vitalis Nutrition** (`vitalis`, lancement) — Shopify live (vitalisnutrition.fr)
mais 0 € sur les 1 500 € visés au 31 août. 0 produit sur Amazon. La chaîne admin
bloque tout, dans cet ordre : domiciliation → DGCCRF → n° Compl'Alim → étiquettes
→ listing Amazon. Dossier Amazon CASE 13063860252.

**MaxTask / MAX BRAIN** (`maxtask`, dev) — app déployée sur maxtask.expo.app,
dépôt `max-os` ; ce dépôt-ci (`MaxTask`) porte la méthode et les hooks.
Blockers : secret `EXPO_TOKEN` vide dans max-os (pas de filet si EAS Workflows
tombe) · synchro Obsidian en chemin absolu vers le Mac, échoue silencieusement
ailleurs.

**Sans PRIMER à ce jour** : Création Contenu, Streakly, FitTrack IA,
Reprise Entreprise.

## Les derniers souvenirs

- **01/08** — Lecture du cerveau rendue mécanique : hook `SessionStart` qui
  injecte ce primer, hook Stop v4 qui compte les discussions et plus seulement
  le code (commit `2f545bc`). Écarté : `brain-export` pour le primer (secret
  partagé + 1500 souvenirs, illisible au démarrage).
- **01/08** — 5 skills/plugins tiers installés dans MaxTask (superpowers,
  claude-mem, impeccable, task-observer, find-skills), commit `2d45aeb`.
- **31/07** — Correction de cap : « je veux SIMPLIFIER mon travail, pas en
  enlever ». Purger une file et préparer des messages à coller sont refusés.
- **31/07** — L'expiration à 14 jours **jette**, elle n'envoie pas. Curseur
  d'autonomie abandonné : 118 des 140 relances n'ont qu'un LinkedIn.
- **31/07** — Audit automatisation : inventaire complet des activités.
- **31/07** — 50 prospects BET/MOE importés dans `crm_contacts` (Axiom).
- **29-30/07** — Créateur d'agents IA livré (max-os PR #54) · liste des 50
  prospects · rendu avec les vraies données (PR #53) · durées et marqueur
  « bloque la vente » sur les tâches (PR #52) · onglet Tâches redessiné (PR #51).

## Les règles qui gouvernent le travail

44 règles dans `core_context`. Celles qui mordent le plus souvent :

- **CE QUI N'EST PAS MÉCANIQUE NE TIENT PAS** — une consigne écrite ne
  s'exécute pas, elle espère ; chercher qui exécute le réflexe.
- **PREUVE AVANT « C'EST FAIT »** — un build qui compile ne prouve pas la mise en ligne.
- **PLAN D'ABORD, ET RE-PLAN SI ÇA DÉRAPE**.
- **ASSEMBLER AVANT DE CODER — et jamais de doublon**.
- **CHAQUE ERREUR DEVIENT UNE RÈGLE** (format RÈGLE — POURQUOI).
- **NE JAMAIS AVALER UNE ERREUR AVEC `|| true`**.
- **UNE CONDITION DE DÉCLENCHEMENT DOIT SE REFERMER D'ELLE-MÊME**.
- **UN GARDE-FOU NE DOIT PAS DÉLÉGUER SA DÉCISION**.
- **AUTOMATISER ≠ PRÉPARER** — si l'humain garde le geste, ce n'est pas automatisé.
- **NE PAS AJOUTER D'AGENT TANT QUE LA SORTIE EST BOUCHÉE**.
- **JOURNAL — noter aussi CE QUI N'A PAS MARCHÉ**.
- **TON : zéro flatterie, et trancher**.
- **GARDE-FOUS DE SÉCURITÉ** — non négociables.
- **PIERRE ANGULAIRE** — horizon prioritaire : le 31 août 2026.

## Réflexe attendu

Lecture avant de répondre : `memories` (recherche sémantique), puis
`core_context`, `businesses.profile`, `skills`, `crm_*`, `tasks`.
Écriture avant de terminer : distiller, dédupliquer, et noter aussi
ce qui n'a **pas** marché.
