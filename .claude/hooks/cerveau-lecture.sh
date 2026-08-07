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

# --- État du filet de sauvegarde ----------------------------------------------
# Le hook SessionEnd échoue en silence : il ne peut rien afficher (la session est
# déjà fermée) et se contente d'écrire dans .cerveau-depot.log. Personne ne lit
# ce fichier. Entre le 01/08 et le 06/08/2026, 82 fins de session d'affilée ont
# donc été perdues sans que rien ne le signale, alors que le dépôt était réputé
# « résolu ». C'est ici — au démarrage, le seul moment où quelqu'un lit — qu'on
# remonte la panne. Une panne silencieuse n'est pas une panne, c'est un mensonge.
alerte=""
journal=".claude/.cerveau-depot.log"
if [ -f "$journal" ]; then
  # Échecs consécutifs depuis le dernier dépôt réussi + horodatage et code du dernier.
  etat="$(awk '
    /déposé/  { n = 0; next }
    /ÉCHEC/   { n++; last = $1 " " $2; code = $4 }
    END       { printf "%d|%s|%s", n + 0, last, code }
  ' "$journal" 2>/dev/null)"
  nb="${etat%%|*}"
  reste="${etat#*|}"
  quand="${reste%%|*}"
  code="${reste##*|}"

  if [ "${nb:-0}" -gt 0 ]; then
    # Heredoc non quoté : les variables s'expandent, les apostrophes françaises
    # et les guillemets restent lisibles tels quels.
    cause="cause à chercher dans .claude/.cerveau-depot.log"
    if [ "$code" = "http=000" ]; then
      cause="$(cat <<'EOF'
http=000 = le proxy de la session refuse *.supabase.co. C'est L'ENVIRONNEMENT,
  jamais le script : il doit être « MaxTask » (Network access = Custom,
  *.supabase.co dans Allowed domains, case « default list of common package
  managers » cochée), et non « Default ». Se vérifie en une commande :
  curl -s -o /dev/null -w "%{http_code}" https://lgvtjqtytwyovllsqbgv.supabase.co/rest/v1/
  401 = le tunnel passe. 000 = il est coupé.
EOF
)"
    fi
    # Les sessions que le hook de fin n'a pas pu envoyer attendent sur le disque.
    # Le MCP Supabase, lui, sort par un autre canal que curl : il atteint le
    # cerveau même quand le proxy bloque. Mais il n'y fait pas passer un verbatim :
    # tout ce qui traverse le MCP traverse d'abord l'agent, qui régénère le texte
    # au lieu de le copier. On saute donc l'étape session_transcripts et on
    # distille directement depuis le fichier — c'est de toute façon le but.
    attente=".claude/sessions-en-attente"
    rattrapage=""
    nb_att="$(ls -1 "$attente"/*.json 2>/dev/null | wc -l | tr -d ' ')"
    if [ "${nb_att:-0}" -gt 0 ]; then
      rattrapage="$(cat <<EOF

RATTRAPAGE À FAIRE TOUT DE SUITE : $nb_att session(s) attendent dans $attente/.
Chaque fichier est la charge JSON d'une session (session_id, project, host,
end_reason, digest, user_turns) que le hook de fin n'a pas pu envoyer.
Ne pas chercher à remonter ce digest tel quel dans session_transcripts : il ne
passerait pas par le réseau mais par l'agent, qui reformule au lieu de copier —
un verbatim qui traverse un modèle n'est plus un verbatim.
Faire directement ce à quoi le sas sert : lire le fichier sur le disque, en tirer
des souvenirs denses dans \`memories\` (mêmes consignes que l'entretien ci-dessous),
vérifier d'abord ce qui y figure déjà pour ne rien redoubler, puis supprimer le
fichier une fois distillé. Le dire à Maxence en une ligne.
EOF
)"
    fi
    if [ "$nb" -gt 1 ]; then
      compte="$nb fins de session d'affilée n'ont RIEN déposé"
    else
      compte="la dernière fin de session n'a RIEN déposé"
    fi
    alerte="$(cat <<EOF
⚠ LE FILET DE SAUVEGARDE DES SESSIONS EST EN PANNE.
$compte dans le cerveau (dernier échec
le $quand, $code). Autant de sessions dont la matière est perdue à la fermeture.
  $cause
Le sas est donc vide pour une mauvaise raison : ne pas en conclure « rien à
distiller ». LE DIRE À MAXENCE dès la première réponse — lui seul peut changer
l'environnement de la session, et tant que ce n'est pas fait, chaque session qui
se ferme dépend du repli sur disque ci-dessous.$rattrapage
EOF
)"
  fi
fi

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

# L'alerte passe AVANT la consigne : si le filet est en panne, c'est la première
# chose à savoir — la consigne d'entretien qui suit porte sur un sas resté vide.
jq -Rs --arg alerte "$alerte" --arg consigne "$consigne" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: ((if $alerte == "" then "" else $alerte + "\n\n" end) + $consigne + .)
  }
}' "$primer"
