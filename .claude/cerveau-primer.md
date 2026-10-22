# Primer du second cerveau — injecté au démarrage de chaque session

> Régénéré depuis Supabase `brain-max` (`lgvtjqtytwyovllsqbgv`) à chaque session.
> Dernière régénération : 22/10/2026 au soir (la précédente datait du 10/08 : 73 jours
> de photo périmée, qui affirmait encore « SUPABASE_ACCESS_TOKEN résolu »).
>
> Ceci est une **photo**, pas la source. Pour toute question précise —
> un contact, un devis, une tâche, un souvenir daté — interroger le cerveau
> en direct via le MCP Supabase. Ce fichier sert à ne jamais démarrer à froid.

## Où en est chaque pôle

Les 7 plans de novembre sont ACTIFS du 23/10 au 22/11 (onglet « Plan du mois » de
l'app). Chaque tâche de plan a son heure dans l'Agenda depuis le 22/10. Les
brouillons de décembre arrivent dans « À valider » le 15/11.

**Noklik** (`noklik`, lancement) — vendre 4 sites en 4 semaines, un par semaine.
1 200 appels d'équipe (60 par jour à quatre, dont 15 pour Maxence), 16 RDV,
8 devis, 197 numéros à ajouter au fichier. Départ (21/10) : 0 devis, 0 vente,
aucun appel depuis le 14/10. CIBLE : les artisans, PAS les 253 exploitations
agricoles du fichier Peillet (décision de Maxence du 06/10, à ne pas reposer en
tâche). Blockers : associés sans le plan (envoi le 23/10), 3 RDV sans date,
fiches légales (SIRET) de Tristan, Noé et William incomplètes.

**Axiom** (`axiom-crm`, dev) — livrer le SaaS le 25/10, puis 30 appels par jour
et mails pour signer les 3 premiers clients. Blocker : déploiement bloqué (Vercel
Pro ou dépôt public), tâche en tête du 23/10. 1 070 contacts, 0 client.

**Vitalis Nutrition** (`vitalis`, lancement) — Shopify vitalisnutrition.fr.
Passer de 6 à 70 visites par jour (plan de Maxence importé tel quel, ses dates
gardées fixes). Produit du mois : magnésium. Concours avec Tristan du 2 au 8/11.
Blockers : le trafic, le planning à envoyer à Tristan (23/10), liens de suivi des
bios (5/11), jeton Shopify de l'app invalide (repris du 04/09, non revérifié).

**Maxwel IA** (`content`, actif) — une vidéo TikTok par jour, 25 → 250 abonnés.
Par semaine : 5 « façon Loucash » (e-commerce ET IA) + 2 humour. Les idées du
17/10 ont été rejetées (« pas vivant, pas drôle ») : tout se réécrit à partir des
vidéos de référence (Tonton Mélique, Pablo, Lucas), à envoyer à Claude le 23/10.

**FitTrack IA** (`fittrack`, dev) — soumise à l'App Store le 07/10, revue à lire
le 27/10. 5 vidéos par semaine (3 motion design, 2 IA ou naturelles), une mise à
jour par mois. Blockers : projet Supabase peut-être en pause (le réactiver le
23/10 avant le test du build), clé RevenueCat (24/10).

**YouTube Faceless** (`yt-faceless`, dev) — @dojomuscu, sport, personnage animé.
2 → 250 abonnés YouTube ce mois (vers 1 000 en 2 à 3 mois). 2 vidéos par semaine,
produites en un bloc de 4 h le samedi.

**MaxTask / MAX BRAIN** (`maxtask`, dev) — l'app, dépôt `max-os`, se déploie à
chaque push sur `main` à l'adresse imprimée par le run :
**https://no-klik-crm.expo.app** (maxtask.expo.app sert encore le build du 04/10).
Livré les 21 et 22/10 : plan du mois, son brouillon automatique, et les horaires
(fonction poser-horaires, commit ccb783f). Ce dépôt-ci (`MaxTask`) porte la
méthode et les hooks.
**ATTENTION, état vérifié le 22/10 :** le workflow « Deploy Edge Functions »
ÉCHOUE (runs 124 et 125, `Invalid access token` : le secret
`SUPABASE_ACCESS_TOKEN` de max-os est invalide). Toute fonction Edge se déploie
par le MCP Supabase, puis se prouve en relisant son code en ligne, octet par
octet. `EXPO_TOKEN` fonctionne (deploy-web vert, run 235).

**Reprise Entreprise** (`reprise`) — en pause, sans PRIMER.

## Le rythme de Maxence

- Alternance terminée (22/08) : journées entières disponibles. Capacité : 8 h de
  travail réel par jour, agenda compris.
- **Basket en pause du 22/10 au 22/11 au moins (blessure à la main)** : tous les
  soirs sont libres jusqu'à 22 h 30. À la reprise : lundi 20h30-22h30, mercredi
  19h-22h, jeudi 20h30-22h, samedi match (30 min de trajet de part et d'autre).
- Appels aux artisans : lun 11h-12h et 14h-17h30, mar-jeu 9h30-12h et 14h-17h30,
  ven 9h30-12h et 14h-15h.

## Les derniers souvenirs

- **22/10** — **Chaque tâche des plans a son heure.** « Pourquoi pour ma journée
  de demain j'ai rien de planifié » : les plans créaient des tâches avec un jour
  et sans heure. Fonction poser-horaires (525 heures posées du 23/10 au 22/11,
  0 chevauchement), appelée à la validation d'un plan et quand une tâche change
  de jour. Agenda à 2 px par minute, plus aucun titre caché. Commit ccb783f.
- **22/10** — **Les 253 exploitations agricoles ne s'importent pas** (décision du
  06/10). Le plan l'avait recréée en tâche « décider » : la décision n'était
  écrite que dans un commentaire de code. Relevé par Maxence, tâche annulée.
- **22/10** — **Blessure à la main : plus de basket pendant au moins un mois.**
  Pause codée du 22/10 au 22/11 (timeSlot.ts et poser-horaires).
- **22/10** — **TESTÉ SANS SUCCÈS** : ordonner un bloc par date de création ;
  l'Agenda à 60 px l'heure (jusqu'à 5 blocs côte à côte). Et `execute_sql` du MCP
  Supabase expire sur certains textes : les envoyer en base64,
  `convert_from(decode('…', 'base64'), 'UTF8')`.
- **22/10** — Les 7 plans de novembre démarrent le 23/10 (rien n'a pu être fait
  le 22) : routines du 21-22 annulées, tâches ponctuelles redatées, cibles
  ajustées.
- **22/10** — Plan du mois : le brouillon du mois suivant est automatique
  (fonction plan-du-mois, cron 05:41 UTC), il part dans « À valider » ; rien
  n'est créé avant l'accord de Maxence.
- **22/10** — Plan du mois dans l'app, en ligne et prouvé (onglet par business,
  « Ta journée » du Cockpit, export PDF, commit 826380a).
- **21-22/10** — TESTÉ SANS SUCCÈS : faire écrire un mois entier par le modèle du
  serveur (trop court pour 90 à 230 tâches).
- **21/10** — Les 7 plans de novembre en base, validés par Maxence (« Je te
  laisse mettre ça dans le planning »). Axiom : développement seul cette semaine.
- **21/10** — Données en temps réel dans Max Brain (registre des entreprises,
  veille par secteur), en ligne, doc `docs/donnees-externes.md` de max-os.
- **20/10** — Exa branché dans prospects-noklik ; fonctions déployées à la main
  depuis que le jeton Supabase de GitHub est refusé.

## Les règles qui gouvernent le travail

119 règles dans `core_context`. Les trois du 22/10, puis celles qui mordent le plus :

- **UN JOUR N'EST PAS UN HORAIRE** — une tâche posée sur un jour reçoit aussi une
  heure, par poser-horaires, jamais « plus tard, à la main ».
- **AVANT DE CRÉER UNE TÂCHE « DÉCIDER X », CHERCHER LA DÉCISION** — dans le
  cerveau ET dans le code. Toute décision de Maxence s'écrit dans memories le
  jour même.
- **UNE TÂCHE ANNULÉE N'EST NI À FAIRE NI FAITE** — tout écran ou calcul filtre
  `status = 'canceled'`.
- **DÉPLOIEMENT DE CODE : POUSSER D'OFFICE** sur `main` — sauf supprimer des
  données, envoyer à un tiers, engager de l'argent.
- **CE QUI N'EST PAS MÉCANIQUE NE TIENT PAS** — une consigne écrite ne
  s'exécute pas, elle espère ; chercher qui exécute le réflexe.
- **PREUVE AVANT « C'EST FAIT »** — un build qui compile ne prouve pas la mise en ligne.
- **UN BLOCKER SE VÉRIFIE CONTRE LE SYSTÈME AVANT D'ÊTRE TRAITÉ** — le primer
  oriente, il ne prouve pas l'état.
- **UN PRIMER NE CONTIENT QUE DU VÉRIFIÉ, JAMAIS UNE DÉDUCTION**.
- **PLAN D'ABORD, ET RE-PLAN SI ÇA DÉRAPE**.
- **ASSEMBLER AVANT DE CODER — et jamais de doublon**.
- **CHAQUE ERREUR DEVIENT UNE RÈGLE** (format RÈGLE — POURQUOI).
- **JOURNAL — noter aussi CE QUI N'A PAS MARCHÉ**.
- **TON : zéro flatterie, et trancher**.
- **GARDE-FOUS DE SÉCURITÉ** — non négociables.

## Réflexe attendu

Lecture avant de répondre : `memories` (recherche sémantique), puis
`core_context`, `businesses.profile` (le PRIMER d'abord), `skills`, `crm_*`,
`tasks`. Écriture avant de terminer : distiller, dédupliquer, et noter aussi
ce qui n'a **pas** marché. Régénérer ce fichier.
