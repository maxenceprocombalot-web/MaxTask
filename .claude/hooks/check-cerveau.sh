#!/usr/bin/env bash
# Hook Stop — refuse de terminer une session de TRAVAIL sans avoir écrit au cerveau.
#
# Adapté du pack de setup d'Albin, où le journal est un fichier journal.md.
# Ici le journal, c'est le projet Supabase brain-max : le message pointe donc
# vers les bonnes tables, sinon l'agent irait écrire dans un fichier fantôme.
#
# VERSION DURCIE (27/07/2026). La première version bloquait à CHAQUE fin de
# tour et laissait l'agent juger de la dispense. En pratique elle s'est
# déclenchée trois fois d'affilée sur des tours de pure discussion, où il n'y
# avait plus rien à écrire : chaque blocage coûtait un aller-retour pour
# reconstater que le cerveau était à jour. On décide donc mécaniquement ici,
# au lieu de déléguer le jugement : on ne bloque que si le dépôt porte une
# trace de travail — fichiers modifiés, ou commits récents.

set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

dirty="$(git status --porcelain 2>/dev/null | head -1)"
# Commits des 3 dernières heures = cette session a livré quelque chose
recent="$(git log --since='3 hours ago' --oneline 2>/dev/null | head -1)"

# Ni modification en cours, ni livraison récente → conversation sans travail :
# on laisse terminer en silence.
if [ -z "$dirty" ] && [ -z "$recent" ]; then
  exit 0
fi

cat <<'EOF'
{"decision": "block", "reason": "STOP — cette session a touché au dépôt (fichiers modifiés ou commits récents). Avant de terminer, mets le CERVEAU à jour (Supabase brain-max) : (1) une entrée dense dans memories, avec source — ce qui a été fait ET où y accéder (PR, fichiers, liens), les décisions ET pourquoi, et la rubrique TESTÉ SANS SUCCÈS quand une piste a échoué ; (2) toute règle née d une erreur dans core_context, au format REGLE — POURQUOI ; (3) le bloc PRIMER de businesses.profile des pôles touchés, REMPLACÉ et non complété (état courant : où j en suis / blockers / next). Dédupliquer avant d insérer, distiller et non recopier. Si tout cela est DÉJÀ fait pour le travail de cette session, dis-le en une phrase et termine — ne réécris pas ce qui est déjà écrit."}
EOF
exit 0
