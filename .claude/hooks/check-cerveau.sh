#!/usr/bin/env bash
# Hook Stop — refuse de terminer une session de TRAVAIL sans avoir écrit au cerveau.
#
# Le journal de Maxence n'est pas un journal.md (comme dans le pack d'Albin)
# mais le projet Supabase brain-max : le message pointe vers les bonnes tables.
#
# HISTORIQUE DES DEUX RATÉS, pour ne pas les refaire :
#   v1 — bloquait à CHAQUE fin de tour, la dispense étant laissée au jugement de
#        l'agent. Résultat : trois blocages d'affilée sur des tours de discussion.
#   v2 — ne bloquait que si le dépôt portait « une trace de travail » (fichiers
#        modifiés OU commits de moins de 3 h). Toujours un livelock : la fenêtre
#        de 3 h reste vraie longtemps après que le cerveau a été mis à jour.
#
# v3 — la bonne question n'est pas « y a-t-il eu du travail ? » mais « le cerveau
# a-t-il été mis à jour DEPUIS ce travail ? ». On compare donc la date du dernier
# travail à celle d'un témoin, .claude/.cerveau-ok, que l'agent touche une fois
# le cerveau écrit. La condition se referme d'elle-même : un seul blocage par
# session de travail, quel que soit le nombre de tours ensuite.

set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

now=$(date +%s)
witness=".claude/.cerveau-ok"

# Date du dernier travail : maintenant si le dépôt est sale, sinon le dernier commit
if [ -n "$(git status --porcelain 2>/dev/null | head -1)" ]; then
  work_ts=$now
else
  work_ts=$(git log -1 --format=%ct 2>/dev/null || echo 0)
fi

# Date du témoin (0 s'il n'existe pas encore)
if [ -f "$witness" ]; then
  witness_ts=$(stat -c %Y "$witness" 2>/dev/null || stat -f %m "$witness" 2>/dev/null || echo 0)
else
  witness_ts=0
fi

# Le cerveau a été écrit après le dernier travail → plus rien à demander
[ "$witness_ts" -ge "$work_ts" ] && exit 0

# Un travail vieux de plus de 24 h n'est plus « cette session » : on n'insiste pas
[ $((now - work_ts)) -gt 86400 ] && exit 0

cat <<'EOF'
{"decision": "block", "reason": "STOP — du travail a été livré depuis la dernière écriture au cerveau. Mets à jour Supabase brain-max : (1) une entrée dense dans memories, avec source — ce qui a été fait ET où y accéder (PR, fichiers, liens), les décisions ET pourquoi, et la rubrique TESTÉ SANS SUCCÈS quand une piste a échoué ; (2) toute règle née d une erreur dans core_context, au format REGLE — POURQUOI ; (3) le bloc PRIMER de businesses.profile des pôles touchés, REMPLACÉ et non complété. Dédupliquer, distiller, ne pas recopier. PUIS, OBLIGATOIREMENT, marque-le en lançant : touch .claude/.cerveau-ok — sans ce témoin le hook se redéclenchera à chaque tour. Si le cerveau est déjà à jour pour ce travail, lance simplement le touch et termine."}
EOF
exit 0
