#!/usr/bin/env bash
# Hook SessionStart — injecte le cerveau dans le contexte AVANT la première réponse.
#
# POURQUOI CE HOOK EXISTE : jusqu'au 01/08/2026, l'écriture au cerveau était
# mécanique (hook Stop) mais la lecture ne reposait sur rien — juste une consigne
# dans AGENTS.md et core_context. L'asymétrie était nette : il a fallu trois
# versions du hook Stop pour rendre l'écriture fiable, preuve que la consigne
# seule ne tient pas. Aucune raison que la lecture tienne mieux sans garde-fou.
#
# CE QU'IL FAIT : verse .claude/cerveau-primer.md dans le contexte de démarrage.
# Le primer est une PHOTO (état des pôles, 12 derniers souvenirs, règles qui
# mordent) — pas la source. Les questions précises passent par le MCP Supabase.
#
# POURQUOI UN FICHIER VERSIONNÉ ET PAS UN APPEL RÉSEAU : interroger Supabase
# depuis un hook exigerait un secret partagé posé sur chaque machine, et
# brain-export renvoie 1500 souvenirs — illisible au démarrage. Le fichier est
# dans le dépôt : il survit au recyclage du conteneur et marche hors ligne.
#
# ENTRETIEN : le primer doit être régénéré depuis le cerveau à chaque session,
# sans quoi il vieillit en silence — et un primer périmé est pire qu'absent,
# puisqu'il est lu avec confiance.
#
# IL PORTE AUSSI LA CONSIGNE DE DISTILLATION. Le hook SessionEnd
# (cerveau-fin.sh) dépose le brut des sessions dans la table session_transcripts
# du cerveau, mais un script shell ne sait pas résumer. C'est donc ici, au
# démarrage, qu'on demande à l'agent — qui, lui, sait — de vider ce sas en
# souvenirs propres. Les deux hooks ne valent que l'un par l'autre : le dépôt
# sans la distillation accumule du verbatim, la distillation sans le dépôt n'a
# rien à traiter.
#
# NI L'UN NI L'AUTRE NE BLOQUE. Un hook Stop imposait l'écriture au cerveau en
# retenant la fin de session ; Maxence l'a fait retirer le 01/08/2026 — il ne
# voulait pas être interrompu. Le couple SessionStart/SessionEnd rend le même
# service en se plaçant AVANT et APRÈS la conversation, jamais en travers.
# L'historique du hook retiré est dans git (.claude/hooks/check-cerveau.sh,
# jusqu'au commit 7442fee).

set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

primer=".claude/cerveau-primer.md"
[ -f "$primer" ] || exit 0

# jq construit le JSON en échappant proprement le markdown (backticks, guillemets,
# accents, sauts de ligne). Sans jq on n'injecte rien plutôt que d'émettre du JSON
# cassé : un hook muet vaut mieux qu'un hook qui fait échouer le démarrage.
command -v jq >/dev/null 2>&1 || exit 0

consigne='Second cerveau de Maxence — photo au démarrage. Lis-la avant de répondre ; pour toute question précise, interroge le projet Supabase brain-max (lgvtjqtytwyovllsqbgv) via le MCP.

ENTRETIEN, une fois par session : vider le sas des sessions précédentes.
    select id, created_at, project, user_turns, digest
    from session_transcripts where not distilled order by created_at;
Chaque ligne est le brut d'\''une session passée, déposé par le hook SessionEnd.
Pour chacune : la DISTILLER en souvenirs denses dans `memories` (décisions et
leurs raisons, faits nouveaux, ce qui a été tenté sans succès, livrables et
leurs liens) — distiller, jamais recopier le verbatim —, mettre à jour le PRIMER
du pôle concerné si son état a changé, puis marquer la ligne traitée :
    update session_transcripts set distilled = true, distilled_at = now() where id = ...;
S'\''il n'\''y a aucune ligne, enchaîner directement sur la demande de Maxence.
Faire cet entretien avant de répondre, et le mentionner en une ligne s'\''il a
produit des souvenirs — Maxence doit pouvoir savoir ce qui entre dans son cerveau.

'

jq -Rs --arg consigne "$consigne" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: ($consigne + .)
  }
}' "$primer"
