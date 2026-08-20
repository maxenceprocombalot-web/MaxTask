# Primer du second cerveau — injecté au démarrage de chaque session

> Régénéré depuis Supabase `brain-max` (`lgvtjqtytwyovllsqbgv`) à chaque session.
> Dernière régénération : 10/08/2026.
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
Le déploiement web part tout seul à chaque push sur `main` et il est vert :
`.github/workflows/deploy-web.yml`, runs 6 à 15, dernier le 09/08 à 15:27 UTC.
`.eas/workflows/deploy-web.yml` n'a jamais tiré une seule fois — le chemin
réel est GitHub Actions, pas EAS Workflows.
Blocker : synchro Obsidian en chemin absolu vers le Mac, échoue silencieusement
ailleurs.
**Résolus, ne plus y revenir** : `EXPO_TOKEN`, posé le 03/08, valide ·
`SUPABASE_ACCESS_TOKEN`, posé entre-temps — le workflow « Deploy Edge
Functions » est vert sur les runs 4 à 10, du 19/08 12:46 au 20/08 09:22 UTC.
Les fonctions edge partent donc toutes seules à chaque push touchant
`supabase/functions/**` ; inutile de passer par le MCP Supabase pour déployer.

**Sans PRIMER à ce jour** : Maxwel IA (ex-« Création Contenu », renommé le
14/08), Streakly, FitTrack IA, Reprise Entreprise.

## Les derniers souvenirs

- **20/08** — **Les quatre devis « toujours pas bons » étaient TRONQUÉS, pas mal
  écrits.** `claude-brain` action `chat` plafonne sa sortie à
  `maxOutputTokens: 1500` **en dur** ; le `max_tokens` envoyé par l'app n'était
  jamais lu. 3 845 caractères générés contre plus de 9 000 dans le devis de
  référence validé. Trois réécritures du prompt n'ont rien pu y faire. Le même
  chemin imposait la persona Jarvis — « réponses courtes, lisibles à voix haute »
  — l'exact contraire d'une commande de six pages. Correctif : action `compose`
  (un appel, sans outils ni mémoire ni persona, plafond respecté, `finishReason`
  renvoyée pour qu'un devis coupé lève une erreur). **RÈGLE — une sortie trop
  courte se mesure contre son plafond avant d'être réécrite :** un paramètre
  envoyé n'est pas un paramètre appliqué.
  Au passage, le logo Axiom partait avec un **fond noir** : `extract_image()`
  rend l'image sans son masque de transparence. On re-rastérise la zone dans la
  page de référence. Contrôle en une ligne : `pixmap.pixel(0,0)`.
- **10/08** — **`EXPO_TOKEN` : rien à réparer, le blocker était périmé de sept
  jours.** Posé par Maxence le 03/08, il fonctionne — étape « Deploy to EAS
  Hosting (production) » verte sur les runs 6 à 15, dernier le 09/08 à 15:27:33
  UTC. Le secret réellement vide aujourd'hui est **`SUPABASE_ACCESS_TOKEN`** :
  même famille d'erreur, workflow « Deploy Edge Functions », 2 runs / 2 échecs
  (06/08 et 09/08). Le geste est celui de Maxence — un secret ne transite pas
  par la conversation. **RÈGLE — un blocker se vérifie contre le système avant
  d'être traité, jamais contre le primer :** le primer est une photo datée, et
  une photo vieillit. Corollaire : trouver un secret CI vide doit déclencher la
  revue de **tous** les secrets cités dans les workflows.
- **06/08** — **LE FILET DE SAUVEGARDE N'A JAMAIS SAUVEGARDÉ UNE VRAIE SESSION.**
  Journal `.claude/.cerveau-depot.log` : 82 fins de session d'affilée en
  `http=000`, du 01/08 12:41 au 06/08 21:55, jusqu'à 321 tours de Maxence jetés
  d'un coup. `session_transcripts` ne porte qu'une ligne, le test manuel du
  01/08. Cause re-mesurée le 06/08 : `connect_rejected — gateway answered 403 to
  CONNECT` sur `lgvtjqtytwyovllsqbgv.supabase.co:443`. Le réglage réseau du
  01/08 n'a pas tenu. **Seul Maxence peut le corriger** (environnement de session
  = `MaxTask`, pas `Default`).
  Deux correctifs posés le 06/08 pour que ça ne dépende plus de ce réglage :
  le hook de fin **garde la charge sur le disque** (`.claude/sessions-en-attente/`)
  au lieu de la jeter, et le hook de démarrage **crie la panne** au lieu de la
  taire. Le rattrapage passe par le **MCP Supabase**, qui atteint le cerveau
  même quand `curl` est bloqué (prouvé : insertion puis suppression d'une ligne
  de test le 06/08 alors que `curl` rendait 000).
- **01/08** — Filet de sauvegarde des sessions (commit `9c119b9`) : hook
  SessionEnd qui dépose le brut dans `session_transcripts`, hook SessionStart
  qui demande de le distiller. Aucun des deux ne bloque. Porté sur `main`
  (`957b4dd`) : toute session part avec, sans avoir à choisir de branche.
  La preuve prise ce jour-là était bonne — et la conclusion « résolu » fausse
  dès le lendemain, voir l'entrée du 06/08 ci-dessus.
- **01/08** — Hook Stop retiré à la demande de Maxence (« enlève le blocage »,
  commit `ac00698`), remplacé le jour même par le filet ci-dessus.
- **01/08** — Lecture du cerveau rendue mécanique : hook `SessionStart` qui
  injecte ce primer (commit `2f545bc`). Écarté : `brain-export` pour le primer
  (secret partagé + 1500 souvenirs, illisible au démarrage).
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

87 règles dans `core_context`. Celles qui mordent le plus souvent :

- **CE QUI N'EST PAS MÉCANIQUE NE TIENT PAS** — une consigne écrite ne
  s'exécute pas, elle espère ; chercher qui exécute le réflexe.
- **PREUVE AVANT « C'EST FAIT »** — un build qui compile ne prouve pas la mise en ligne.
- **UNE PREUVE VAUT POUR L'INSTANT OÙ ELLE EST PRISE** — ce qui repose sur un
  réglage extérieur au dépôt se re-vérifie à l'usage, et son échec doit se voir.
- **UN BLOCKER SE VÉRIFIE CONTRE LE SYSTÈME AVANT D'ÊTRE TRAITÉ** — le primer
  oriente, il ne prouve pas l'état ; un blocage levé y survit sinon des jours.
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
