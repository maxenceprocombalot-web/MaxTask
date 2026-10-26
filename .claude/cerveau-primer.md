# Primer du second cerveau — injecté au démarrage de chaque session

> Régénéré depuis Supabase `brain-max` (`lgvtjqtytwyovllsqbgv`) à chaque session.
> Dernière régénération : 26/10/2026 (mails de prospection Axiom automatiques, passages
> sans connecteur, mots de passe des boîtes mail). La précédente le 25/10 au soir.
>
> Ceci est une **photo**, pas la source. Pour toute question précise —
> un contact, un devis, une tâche, un souvenir daté — interroger le cerveau
> en direct via le MCP Supabase. Ce fichier sert à ne jamais démarrer à froid.

## Où en est chaque pôle

Les 7 plans de novembre sont ACTIFS du 23/10 au 22/11 (onglet « Plan du mois » de
l'app). Chaque tâche de plan a son heure dans l'Agenda depuis le 22/10, posée en
UN BLOC PAR BUSINESS ; l'Agenda et le Cockpit montrent une carte par business avec
sa liste à cocher (commit 97cc356). Les brouillons de décembre arrivent dans
« À valider » le 15/11.

**Noklik** (`noklik`, lancement) — vendre 4 sites en 4 semaines. APPELS : 60 par jour
pour chacun des quatre associés. CRM au 25/10 : 100 appels (8 depuis le 22/10), 4 RDV,
0 devis, 0 vente, 226 numéros jamais appelés. FICHE GOOGLE DE NOKLIK ABANDONNÉE « pour
l'instant » (24 et 25/10) ; le cas client Artisan Mousseau est gardé. CIBLE : les artisans,
PAS les 253 exploitations agricoles (décision du 06/10). Blockers : les appels n'ont pas
vraiment commencé, fiches légales des associés (à eux de les remplir), 3 RDV sans date.

**Axiom** (`axiom-crm`, dev) — livrer le SaaS, puis 15 appels par jour du lundi au
jeudi dès le 26/10. ADRESSE : https://axiom-ia.fr, contact@axiom-ia.fr (axiom.fr est une
AUTRE société). Script d'appel court et séquence de 3 mails écrits dans les tâches du
26/10. MAILS DE PROSPECTION AUTOMATIQUES dès le 27/10 (décision du 26/10) : 10 nouveaux
prospects par jour de semaine à 8 h 07 depuis contact@axiom-ia.fr, relances J+4 et J+10,
arrêt sur réponse ou stop (fonction sequence-prospection, cron jobid 35). Blockers : SaaS
pas fini au 23/10 (non revérifié), connecteur Supabase du passage du matin à ajouter.

**Vitalis Nutrition** (`vitalis`, lancement) — Shopify vitalisnutrition.fr, passer de 6 à
70 visites par jour. Au 25/10 : 5,6 visites par jour, 0 commande depuis le 21/10, TikTok
@vitalisnutrition.fr 20 abonnés. METRICOOL BRANCHÉ le 25/10 (marque Vitalis Nutrition,
Instagram, TikTok, Facebook) : Claude programme les publications quand Maxence le demande.
Concours avec Tristan du 2 au 8/11, 8 vidéos avec lui.

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

**MaxTask / MAX BRAIN** (`maxtask`, dev) — l'app, dépôt `max-os`, se déploie à chaque push
sur `main` à **https://no-klik-crm.expo.app**. Livré jusqu'au 25/10 : plan du mois,
horaires, cartes par business, retours sans cocher, REPORT DE NUIT sans limite (toute
tâche non cochée revient chaque nuit sans heure, sauf les routines ; cochée, elle sort de
la liste), lecture des abonnés TikTok et YouTube (social-sync, en attente du SQL).
**Tâches planifiées de Claude** (tout en brouillon, rien ne publie) : passage du soir
21:41 (PROUVÉ le 24/10), du matin lun-ven 7:41, de la semaine dimanche 19:17.
**À SAVOIR :** le connecteur Supabase bloque les UPDATE de `core_context` et
`apply_migration` (validation qui n'arrive pas) ; INSERT et UPDATE de tasks, plans,
businesses passent. Deux fichiers SQL attendent Maxence dans ce dépôt
(`a-executer-dans-supabase-*.sql`). Le déploiement des fonctions remarche (run 128+).

**Reprise Entreprise** (`reprise`) — en pause, sans PRIMER.

## Le rythme de Maxence

- Alternance terminée (22/08) : journées entières disponibles. Capacité : 8 h de
  travail réel par jour, agenda compris ; **9 h 30 du lundi au vendredi pendant la
  pause du basket** (choix du 22/10 : journées plus longues, rien de retiré),
  `capaciteDu` dans src/utils/planDuMois.ts de max-os.
- **Report de nuit (25/10)** : une tâche non cochée revient chaque nuit, sans heure.
- **Basket en pause du 22/10 au 22/11 au moins (blessure à la main)** : tous les
  soirs sont libres jusqu'à 22 h 30. À la reprise : lundi 20h30-22h30, mercredi
  19h-22h, jeudi 20h30-22h, samedi match (30 min de trajet de part et d'autre).
- Appels aux artisans : lun 11h-12h et 14h-17h30, mar-jeu 9h30-12h et 14h-17h30,
  ven 9h30-12h et 14h-15h.

## Les derniers souvenirs

- **26/10** — **Les mails de prospection Axiom partent seuls**, relances comprises
  (« tu les envoies tout seul, et même de relance ») : passage à blanc 10 prêts, aperçu
  reçu par Maxence. Règle « ENVOI AUTOMATIQUE DE PROSPECTION ». Les passages du matin et
  de la semaine ont tourné à vide (pas de connecteur). Mots de passe des boîtes mail en
  clair dans mail_settings, affichés par erreur : à changer chez OVH.

- **25/10** — **Report de nuit sans limite** : « toutes les tâches non faites passent au
  lendemain sans heure chaque nuit, tant qu'elle n'est pas cochée, tant que c'est pas une
  routine ». Garde-fou validé : prévenir au delà de 10 tâches sans horaire ou 7 nuits.
- **25/10** — **Publication** : quand Maxence la demande, Claude publie ou programme
  directement ; les tâches automatiques restent en brouillon.
- **25/10** — **Metricool branché** pour Vitalis ; abonnés TikTok et YouTube lisibles sur
  les pages publiques (point de départ relevé par Claude, Maxence n'y a pas accès).
- **25/10** — Script d'appel Axiom : il existait (05/08, tâche ccf16575), version courte
  SaaS écrite. Séquence de 3 mails Axiom écrite. Passage du soir prouvé ; passages du
  matin et de la semaine créés (sans connecteurs pour l'instant).
- **24/10** — **Deux tâches planifiées de plus, à créer le 25/10 si le passage du
  soir marche** (« oui crée les deux demain si ça passe ») : une centaine de tâches
  des plans disent « Claude prépare » et rien ne les préparait.
- **24/10** — **Retours sur les tâches** : Maxence note ce qui s'est passé dans la
  fiche d'une tâche, le passage du soir s'y adapte (règle « RETOURS DE MAXENCE SUR
  LES TÂCHES »). Stories Vitalis : on garde une par jour, avec 3 idées dans chaque
  tâche ; Metricool noté, pas installé.
- **23/10** — **Une tâche non faite passe au lendemain sans heure** ; 57 petites
  relectures des plans sont « si j'ai du temps », sans heure. REFUSÉS par Maxence :
  un plafond de 8 h, et resservir les vieilles tâches sans date.
- **23/10** — Tristan : 2 vidéos par semaine (8 en tout), pas 2 sur le mois.
  Relecture des 7 plans faite. Appels pas encore commencés ; Axiom pas fini
  (livraison visée ce week end, lancement lundi « optimiste »), appels Axiom du
  vendredi annulés. Notes 📝 « comment faire » dans les tâches.

- **22/10 (soir)** — **Une journée se lit par business.** « Au lieu de petites tâches
  de 15 minutes… ça, ça, ça pour Vitalis » : cartes par business dans l'Agenda et
  le Cockpit (le vendredi 23 : 25 tâches en 9 blocs). Bancs : Agenda 71/71,
  Cockpit 23/23 ; en ligne (run 236, bundle relu). Commit 97cc356.
- **22/10 (soir)** — **Couleurs, choix de Maxence** : FitTrack noir (contour clair),
  Vitalis or, Axiom blanc, Maxwel bleu ciel, YouTube rouge ; Noklik garde son bleu.
  120 tâches Noklik n'avaient pas de projet (en or comme Vitalis, rangées sous
  « Perso ») : corrigé en base (migration noklik_projet_des_taches).
- **22/10 (soir)** — **Le filet de sauvegarde des sessions est toujours en panne**
  (curl vers Supabase = 000, environnement « Default ») : en attendant
  l'environnement « MaxTask », finir chaque session par « consigne dans le cerveau ».
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

Règles de `core_context` ; celles du 22 au 26/10, puis celles qui mordent le plus :

- **ENVOI AUTOMATIQUE DE PROSPECTION** — seulement dans le périmètre que Maxence a validé,
  textes fixes, arrêt sur réponse, passage à blanc et aperçu avant le premier envoi.
- **JAMAIS DE select * SUR UNE TABLE QUI PORTE DES MOTS DE PASSE** (mail_settings).

- **UN PLAN NE RECRÉE PAS CE QUI EXISTE DÉJÀ** — chercher X dans les tâches terminées
  (documents, notes), skills et memories avant de créer « préparer X ».
- **UNE VÉRIFICATION PROGRAMMÉE SE FAIT QUAND ELLE SONNE** — jamais « rien à faire ».

- **RETOURS DE MAXENCE SUR LES TÂCHES** — un retour noté dans une tâche se lit et
  change la suite le soir même.
- **UNE TÂCHE PORTE DE QUOI LA FAIRE** — les idées, le texte à envoyer, le
  planning : dans la note de la tâche, pas ailleurs.

- **UNE JOURNÉE SE LIT PAR BUSINESS** — un bloc par business et par plage, avec sa
  liste à cocher, jamais une suite de petites tâches mélangées ; une couleur par
  business qui ne se confond avec aucune autre.
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
