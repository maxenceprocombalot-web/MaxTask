#!/usr/bin/env bash
# Hook Stop — refuse de terminer une session de travail sans avoir écrit au cerveau.
#
# Adapté du pack de setup d'Albin, où le journal est un fichier journal.md.
# Ici le journal, c'est le projet Supabase brain-max : le message pointe donc
# vers les bonnes tables, sinon l'agent irait écrire dans un fichier fantôme.
#
# Le hook n'inspecte rien : il rappelle la règle et laisse l'agent juger, ce qui
# est fiable parce que la même consigne est dans AGENTS.md et dans core_context.
# La clause de dispense évite qu'une simple question déclenche une écriture.

cat <<'EOF'
{"decision": "block", "reason": "STOP — avant de terminer, mets le CERVEAU à jour (Supabase brain-max). Si cette conversation a écrit des fichiers, lancé des commandes, mergé du code ou pris des décisions : (1) une entrée dense dans memories, avec source — ce qui a été fait ET où y accéder (PR, fichiers, liens), les décisions ET pourquoi, et la rubrique TESTÉ SANS SUCCÈS quand une piste a échoué ; (2) toute règle née d une erreur dans core_context, au format REGLE — POURQUOI ; (3) le bloc PRIMER de businesses.profile des pôles touchés, REMPLACÉ et non complété (état courant : où j en suis / blockers / next). Dédupliquer avant d insérer, distiller et non recopier. SEULE DISPENSE : une pure question ou discussion, sans aucun fichier écrit, aucune commande lancée et aucune décision prise — dans ce cas, termine sans rien journaliser."}
EOF
exit 0
