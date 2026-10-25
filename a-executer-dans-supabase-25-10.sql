-- À coller dans Supabase → projet brain-max → SQL Editor → Run (25/10/2026).
-- Deux écritures dans les règles (core_context) : la note du report de nuit avec son garde-fou, et la publication retirée des garde-fous.
-- Rien n'est supprimé. Si tu le lances deux fois, la note s'ajoute deux fois : une seule fois suffit.

update core_context set content = content || $$

EXCEPTION DÉCIDÉE PAR MAXENCE LE 25/10/2026 : « toutes les tâches non faites passent au lendemain sans heure chaque nuit, tant qu'elle n'est pas cochée, tant que c'est pas une routine ». rollover_incomplete_tasks_at n'a plus de limite d'ancienneté (migration 20261025132322). Ce qui rend l'exception tenable : la tâche reportée perd son heure (étiquette sans-horaire, poser-horaires ne la replace pas), donc elle ne percute plus la journée horaire ; les routines ne sont jamais reportées.
GARDE-FOU VALIDÉ PAR MAXENCE LE 25/10 : si la liste « sans horaire » d'un jour dépasse 10 tâches, ou si une tâche traîne plus de 7 nuits (reporte_n > 7), le signaler à Maxence (passage du soir ou session) au lieu de laisser grossir la liste.$$
where label = 'UN REPORT AUTOMATIQUE SANS LIMITE D''ANCIENNETÉ DÉTRUIT LE CALENDRIER';

-- (Le souvenir de la décision a été écrit directement le 25/10 : les INSERT passent, seuls les UPDATE de core_context bloquent.)

-- Ajout du 25/10 au soir : la publication sort des garde-fous (Maxence : « enlève cette règle où tu ne publies rien
-- à ma place »). Même blocage : la validation du connecteur n'arrive pas.
update core_context set content = replace(content, '③ Confirmer avant toute action difficilement réversible : suppression, publication, envoi à un tiers, engagement financier, action en production.', '③ Confirmer avant toute action difficilement réversible : suppression, envoi à un tiers, engagement financier, action en production. PUBLICATION RETIRÉE LE 25/10/2026 À LA DEMANDE DE MAXENCE (« enlève cette règle où tu ne publies rien à ma place ») : quand Maxence demande de publier ou de programmer une publication (Metricool, réseaux), le faire directement, sans brouillon à valider ; dire en une ligne ce qui part, où et quand.')
where label = 'GARDE-FOUS DE SÉCURITÉ (non négociables)';
