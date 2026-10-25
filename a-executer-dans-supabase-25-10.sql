-- À coller dans Supabase → projet brain-max → SQL Editor → Run (25/10/2026).
-- Deux écritures : la note dans la règle du report (avec le garde-fou), et le souvenir de ta décision.
-- Rien n'est supprimé. Si tu le lances deux fois, la note s'ajoute deux fois : une seule fois suffit.

update core_context set content = content || $$

EXCEPTION DÉCIDÉE PAR MAXENCE LE 25/10/2026 : « toutes les tâches non faites passent au lendemain sans heure chaque nuit, tant qu'elle n'est pas cochée, tant que c'est pas une routine ». rollover_incomplete_tasks_at n'a plus de limite d'ancienneté (migration 20261025132322). Ce qui rend l'exception tenable : la tâche reportée perd son heure (étiquette sans-horaire, poser-horaires ne la replace pas), donc elle ne percute plus la journée horaire ; les routines ne sont jamais reportées.
GARDE-FOU VALIDÉ PAR MAXENCE LE 25/10 : si la liste « sans horaire » d'un jour dépasse 10 tâches, ou si une tâche traîne plus de 7 nuits (reporte_n > 7), le signaler à Maxence (passage du soir ou session) au lieu de laisser grossir la liste.$$
where label = 'UN REPORT AUTOMATIQUE SANS LIMITE D''ANCIENNETÉ DÉTRUIT LE CALENDRIER';

insert into memories (content, source) values ($$25/10/2026 — REPORT DE NUIT, NOUVELLE RÈGLE DE MAXENCE : toute tâche non cochée revient au lendemain, sans heure, chaque nuit, tant qu'elle n'est pas cochée ; sauf les routines (stories, carrousels, commentaires : étiquette routine), qui restent sur leur jour ; une fois cochée, elle sort de la liste.
Constat avant : vendredi 23/10, 23 faites, 2 annulées, 2 reportées au 25 sans heure ; samedi 24/10, 4 routines restées sur samedi (normal, confirmé par Maxence) et 3 tâches reportées au 25. L'ancienne règle (23/10) arrêtait le report 5 jours après le jour prévu pour les plans et ne reportait qu'une fois hors plan, puis vivier.
FAIT : migration 20261025132322 (appliquée, définition relue en base), plus de limite, rattrape tout ce qui est en retard (due_date < aujourd'hui), reporte_n compte les nuits. Essai sur les données réelles annulé : 14 tâches du 25 passent au 26 sans heure (dont 8 avaient une heure), 6 routines restent. Agenda : une tâche cochée sort de « SANS HORAIRE » (avant : restait barrée), banc 10/10, ancienne version 8/10, commit c8df36e de max-os, déploiement web run 240 vert. Le Cockpit retirait déjà les tâches cochées.
Garde-fou validé par Maxence, écrit dans la règle core_context « UN REPORT AUTOMATIQUE SANS LIMITE… » : signaler si la liste sans horaire dépasse 10 tâches ou si une tâche traîne plus de 7 nuits.
TESTÉ SANS SUCCÈS : écrire cette note dans core_context par le connecteur Supabase depuis la session cloud. L'UPDATE déclenche une question de validation du serveur qui n'apparaît pas à Maxence, même en surveillant l'app : 3 échecs le 25/10 (délai d'une minute dépassé). Passé par l'éditeur SQL de Supabase.$$, 'conversation Maxence 25/10');

-- Ajout du 25/10 au soir : la publication sort des garde-fous (Maxence : « enlève cette règle où tu ne publies rien
-- à ma place »). Même blocage : la validation du connecteur n'arrive pas.
update core_context set content = replace(content, '③ Confirmer avant toute action difficilement réversible : suppression, publication, envoi à un tiers, engagement financier, action en production.', '③ Confirmer avant toute action difficilement réversible : suppression, envoi à un tiers, engagement financier, action en production. PUBLICATION RETIRÉE LE 25/10/2026 À LA DEMANDE DE MAXENCE (« enlève cette règle où tu ne publies rien à ma place ») : quand Maxence demande de publier ou de programmer une publication (Metricool, réseaux), le faire directement, sans brouillon à valider ; dire en une ligne ce qui part, où et quand.')
where label = 'GARDE-FOUS DE SÉCURITÉ (non négociables)';
