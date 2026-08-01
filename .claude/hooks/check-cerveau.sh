#!/usr/bin/env bash
# Hook Stop — refuse de terminer une session sans avoir écrit au cerveau.
#
# Le journal de Maxence n'est pas un journal.md (comme dans le pack d'Albin)
# mais le projet Supabase brain-max : le message pointe vers les bonnes tables.
#
# HISTORIQUE DES RATÉS, pour ne pas les refaire :
#   v1 — bloquait à CHAQUE fin de tour, la dispense étant laissée au jugement de
#        l'agent. Résultat : trois blocages d'affilée sur des tours de discussion.
#   v2 — ne bloquait que si le dépôt portait « une trace de travail » (fichiers
#        modifiés OU commits de moins de 3 h). Toujours un livelock : la fenêtre
#        de 3 h reste vraie longtemps après que le cerveau a été mis à jour.
#   v3 — comparait la date du dernier travail à celle d'un témoin .cerveau-ok.
#        Correct, mais AVEUGLE AUX DISCUSSIONS : le « travail » se mesurait au
#        seul état de git, donc une session passée à décider, corriger ou
#        arbitrer sans toucher au code ne déclenchait jamais rien. Or c'est
#        souvent là que se disent les choses qui méritent d'être gardées.
#
# v4 (01/08/2026, demande de Maxence : « qu'on enrichisse le cerveau infiniment »)
# — le déclencheur devient « une session a eu lieu », pas « le dépôt a bougé ».
# La date de référence est le plus récent des deux : début de session (témoin
# .session-active posé par le hook SessionStart) et travail git. Le témoin
# .cerveau-ok referme la condition comme en v3.
#
# POURQUOI PAS « À CHAQUE RÉPONSE », qui est la demande littérale : c'est
# exactement la v1, et elle est documentée ci-dessus comme un échec. Un blocage
# par session capture la même matière sans le livelock — la condition se referme
# d'elle-même dès que le témoin est posé (règle core_context « UNE CONDITION DE
# DÉCLENCHEMENT DOIT SE REFERMER D'ELLE-MÊME »).

set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

now=$(date +%s)
witness=".claude/.cerveau-ok"
session=".claude/.session-active"

mtime() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || echo 0; }

# ① Travail git : maintenant si le dépôt est sale, sinon le dernier commit
if [ -n "$(git status --porcelain 2>/dev/null | head -1)" ]; then
  work_ts=$now
else
  work_ts=$(git log -1 --format=%ct 2>/dev/null || echo 0)
fi

# ② Début de session — c'est ce qui fait compter les discussions sans code
if [ -f "$session" ]; then session_ts=$(mtime "$session"); else session_ts=0; fi

# La référence est le plus récent des deux
[ "$session_ts" -gt "$work_ts" ] && work_ts=$session_ts

# Date du témoin (0 s'il n'existe pas encore)
if [ -f "$witness" ]; then witness_ts=$(mtime "$witness"); else witness_ts=0; fi

# Le cerveau a été écrit après le dernier travail → plus rien à demander
[ "$witness_ts" -ge "$work_ts" ] && exit 0

# Un travail vieux de plus de 24 h n'est plus « cette session » : on n'insiste pas
[ $((now - work_ts)) -gt 86400 ] && exit 0

cat <<'EOF'
{"decision": "block", "reason": "STOP — cette session n a pas encore ete versee au cerveau. Mets a jour Supabase brain-max : (1) une entree dense dans memories, avec source — ce qui s est dit ou s est fait ET ou y acceder (PR, fichiers, liens), les decisions ET pourquoi, et la rubrique TESTE SANS SUCCES quand une piste a echoue ; (2) toute regle nee d une erreur dans core_context, au format REGLE — POURQUOI ; (3) le bloc PRIMER de businesses.profile des poles touches, REMPLACE et non complete. Distiller, dedupliquer, ne pas recopier. Une discussion compte autant que du code : un arbitrage, une correction ou un refus motive de Maxence sont precisement ce qu il ne faut pas perdre. Si vraiment rien de durable ne s est dit, ne force pas une entree creuse. PUIS, DANS TOUS LES CAS : regenere .claude/cerveau-primer.md depuis le cerveau (c est lui qui sera injecte au prochain demarrage) et marque la session finie avec : touch .claude/.cerveau-ok — sans ce temoin le hook se redeclenchera a chaque tour."}
EOF
exit 0
