#!/usr/bin/env bash
# Hook SessionEnd — dépose le brut de la session dans le sas du second cerveau.
#
# POURQUOI À LA FERMETURE ET PAS AVANT : sur Claude Code web, la session tourne
# dans un conteneur détruit dès qu'elle se termine. Le transcript (souvent des
# dizaines de Mo) vit sur ce disque éphémère et disparaît avec lui. Si le dépôt
# n'a pas lieu à la fermeture, il n'y a plus rien à distiller ensuite.
#
# POURQUOI UN SAS ET PAS `memories` DIRECTEMENT : un hook est un script shell,
# il ne sait pas distiller. Écrire le verbatim dans `memories` violerait la
# règle « distiller, pas copier » et noierait les vrais souvenirs. Le brut
# atterrit donc dans `session_transcripts`, et c'est la session SUIVANTE — un
# modèle, capable de résumer — qui le transforme en souvenirs propres puis
# marque la ligne distilled=true. Le hook SessionStart rappelle de le faire.
#
# POURQUOI CE HOOK NE BLOQUE JAMAIS RIEN : il s'exécute alors que la session est
# déjà finie, donc il ne peut pas interrompre Maxence. C'est tout l'intérêt par
# rapport au hook Stop retiré le 01/08/2026 — même garantie, sans l'interruption.
#
# CLÉ : la clé ci-dessous est la clé PUBLIABLE du projet Supabase, celle qui est
# déjà publique dans le bundle de l'app web. Ce n'est pas un secret. La table
# n'accepte QUE l'insertion (RLS, aucune lecture possible avec cette clé) et
# borne la taille d'une ligne, donc la fuite d'usage possible se limite à des
# insertions parasites — jamais une lecture du cerveau.
#
# SORTIE : toujours 0. Un échec de sauvegarde ne doit jamais salir une fin de
# session ; il est journalisé dans .claude/.cerveau-depot.log et rien de plus.

set -u

SUPABASE_URL="https://lgvtjqtytwyovllsqbgv.supabase.co/rest/v1/session_transcripts"
SUPABASE_KEY="sb_publishable_8yDNdqp3A3QZ27xlIuPJDg_tNI7evYr"
MAX_DIGEST=380000   # la contrainte SQL coupe à 400000 ; on garde de la marge

entree="$(cat 2>/dev/null)"
[ -n "$entree" ] || exit 0

command -v jq >/dev/null 2>&1 || exit 0   # sans jq, on ne sait pas lire l'entrée
command -v curl >/dev/null 2>&1 || exit 0

transcript="$(printf '%s' "$entree" | jq -r '.transcript_path // empty' 2>/dev/null)"
session_id="$(printf '%s' "$entree" | jq -r '.session_id // empty' 2>/dev/null)"
projet="$(printf '%s' "$entree" | jq -r '.cwd // empty' 2>/dev/null)"
raison="$(printf '%s' "$entree" | jq -r '.reason // empty' 2>/dev/null)"

[ -n "$transcript" ] && [ -r "$transcript" ] || exit 0

journal="${CLAUDE_PROJECT_DIR:-.}/.claude/.cerveau-depot.log"
horodatage="$(date '+%Y-%m-%d %H:%M:%S')"

# --- Extraction des tours de Maxence -----------------------------------------
# On ne garde QUE ce que Maxence a écrit : c'est la matière qui ne se retrouve
# nulle part ailleurs. Ce que l'agent a fait est déjà dans git et dans le cerveau ;
# le réinjecter triplerait le volume sans rien apprendre à la distillation.
# Sont écartés : les résultats d'outils, les rappels système, les commandes
# slash, et les relances automatiques du harnais (« Continue from where you
# left off. ») qui ne viennent pas de Maxence.
#
# UN TOUR = UNE LIGNE. Les sauts de ligne internes sont remplacés par ⏎ avant
# tout traitement. Sans ça, un message collé de 300 lignes comptait pour 300
# tours et les filtres ne voyaient que sa première ligne — la première version
# annonçait 7863 tours pour 5 demandes réelles.
#
# CHAQUE TOUR EST BORNÉ à 1500 caractères : les vraies demandes de Maxence font
# une à trois lignes, alors qu'une commande slash peut injecter un schéma JSON
# de 40 Ko sous le type « user ». Sans ce plafond, ces blocs noyaient les
# demandes réelles et faisaient exploser la taille du dépôt.
tmp="$(mktemp -d 2>/dev/null)" || exit 0
trap 'rm -rf "$tmp"' EXIT

jq -r 'select(.type=="user") | .message.content as $c
    | (if ($c|type)=="string" then $c
       else ($c | map(select(.type=="text") | .text) | join("\n")) end)
    | select(. != null and length > 0)
    | gsub("\n"; " ⏎ ")
    | if length > 1500 then .[0:1500] + " […tour tronqué…]" else . end' \
    "$transcript" 2>/dev/null \
  | grep -vE '^<(system-reminder|command-name|command-message|local-command|github-webhook)' \
  | grep -vE '^(Continue from where you left off\.|\[Request interrupted by user)' \
  | grep -vE '^\s*$' > "$tmp/tours.txt" 2>/dev/null

nb_tours="$(wc -l < "$tmp/tours.txt" 2>/dev/null | tr -d ' ')"
tours="$(cat "$tmp/tours.txt" 2>/dev/null)"

# Une session sans un seul tour de Maxence n'a rien à distiller (session
# déclenchée par un cron, ou ouverte puis refermée) : on ne dépose pas de bruit.
[ "${nb_tours:-0}" -gt 0 ] || { echo "$horodatage  ignorée (aucun tour utilisateur)" >>"$journal" 2>/dev/null; exit 0; }

# --- Ce que la session a produit ---------------------------------------------
commits=""
if command -v git >/dev/null 2>&1 && [ -n "$projet" ] && [ -d "$projet/.git" ]; then
  commits="$(git -C "$projet" log --since='36 hours ago' --pretty='%h %ad %s' --date=short 2>/dev/null | head -40)"
fi

printf '%s\n' \
  "SESSION CLAUDE CODE — brut déposé le $horodatage" \
  "projet: ${projet:-?}   machine: $(hostname 2>/dev/null || echo '?')   fin: ${raison:-?}" \
  "tours de Maxence: $nb_tours" \
  "" \
  "═══ CE QUE MAXENCE A DEMANDÉ (verbatim, dans l'ordre) ═══" \
  "$tours" \
  "" \
  "═══ COMMITS DES 36 DERNIÈRES HEURES ═══" \
  "${commits:-(aucun)}" > "$tmp/digest.txt" 2>/dev/null

# Si la session a été longue, on garde la FIN : les dernières demandes sont
# celles qui portent les décisions, les corrections et les changements de cap.
if [ "$(wc -c < "$tmp/digest.txt" 2>/dev/null | tr -d ' ')" -gt "$MAX_DIGEST" ]; then
  { echo "[…début tronqué, session trop longue…]"; tail -c "$MAX_DIGEST" "$tmp/digest.txt"; } > "$tmp/coupe.txt"
  mv "$tmp/coupe.txt" "$tmp/digest.txt"
fi

# --- Dépôt --------------------------------------------------------------------
# Le digest passe par --rawfile et la charge par un fichier : un digest de
# plusieurs centaines de Ko dépasse la limite d'arguments du système (E2BIG) et
# faisait échouer jq en silence — première version, rien n'était jamais envoyé.
jq -n --rawfile d "$tmp/digest.txt" \
  --arg s "$session_id" --arg p "$projet" --arg h "$(hostname 2>/dev/null)" \
  --arg r "$raison" --argjson n "${nb_tours:-0}" \
  '{session_id:$s, project:$p, host:$h, end_reason:$r, digest:$d, user_turns:$n}' \
  > "$tmp/charge.json" 2>/dev/null

[ -s "$tmp/charge.json" ] || { echo "$horodatage  ÉCHEC construction de la charge" >>"$journal" 2>/dev/null; exit 0; }
poids="$(wc -c < "$tmp/digest.txt" | tr -d ' ')"

code="$(curl -s -o /dev/null -w '%{http_code}' \
  --max-time 20 \
  -X POST "$SUPABASE_URL" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  --data-binary "@$tmp/charge.json" 2>/dev/null)"

if [ "$code" = "201" ] || [ "$code" = "200" ]; then
  echo "$horodatage  déposé ($nb_tours tours, $poids octets)" >>"$journal" 2>/dev/null
else
  # ÉCHEC — REPLI SUR LE DISQUE, ajouté le 06/08/2026.
  #
  # POURQUOI : entre le 01/08 et le 06/08, 82 fins de session d'affilée ont
  # échoué en http=000 et la matière a été jetée à chaque fois. Or le réseau du
  # conteneur n'est pas le seul chemin vers le cerveau : l'agent, lui, l'atteint
  # par le MCP Supabase, qui sort par un autre canal et fonctionne même quand
  # curl est bloqué. Il suffit donc de GARDER la charge : la session suivante la
  # déposera par le MCP. Sans ce repli, on dépend d'un réglage d'environnement
  # que seul Maxence peut faire, et tout ce qui se dit entre-temps est perdu.
  #
  # Le dossier est ignoré par git : ces fichiers contiennent le verbatim de
  # Maxence, ils vont au cerveau, pas dans un dépôt public.
  # Le fichier porte l'identifiant de session SEUL, sans horodatage : le hook peut
  # tourner plusieurs fois pour une même session (fermeture, /clear, reprise), et
  # on veut alors ÉCRASER la charge précédente, pas en empiler une copie. Sinon la
  # même conversation serait déposée cinq fois dans le cerveau — constaté en test
  # le 06/08/2026. La dernière écriture est aussi la plus complète : elle contient
  # tous les tours des précédentes.
  attente="${CLAUDE_PROJECT_DIR:-.}/.claude/sessions-en-attente"
  if mkdir -p "$attente" 2>/dev/null && cp "$tmp/charge.json" \
       "$attente/${session_id:-sans-id}.json" 2>/dev/null; then
    echo "$horodatage  ÉCHEC http=${code:-?} ($nb_tours tours) — gardé en attente sur le disque" >>"$journal" 2>/dev/null
  else
    echo "$horodatage  ÉCHEC http=${code:-?} ($nb_tours tours) — non sauvegardé" >>"$journal" 2>/dev/null
  fi
fi

exit 0

# ─────────────────────────────────────────────────────────────────────────────
# DÉPENDANCE À LA POLITIQUE RÉSEAU DE L'ENVIRONNEMENT — lire avant de débugger
#
# Ce hook a besoin que *.supabase.co soit joignable depuis la session. Ce n'est
# PAS acquis par défaut : les sessions Claude Code web sortent par un proxy dont
# le niveau « Trusted » ne contient aucun domaine Supabase. Dans cet état, le
# gateway répond 403 au CONNECT, curl rend http=000, et on obtient la ligne
# « ÉCHEC » ci-dessus alors que la charge est parfaitement construite.
#
# C'est ce qui s'est passé le 01/08/2026 sur l'environnement « Default » :
#   connect_rejected — gateway answered 403 to CONNECT
#   host: lgvtjqtytwyovllsqbgv.supabase.co:443
#
# CRU RÉSOLU le 01/08/2026 par un environnement dédié « MaxTask » : Network
# access réglé sur Custom, *.supabase.co dans Allowed domains, et la case « Also
# include default list of common package managers » cochée — sans elle on perd
# npm, PyPI, GitHub et Ubuntu, et les sessions deviennent inutilisables.
# La preuve d'alors était réelle : le 01/08 à 12:02 UTC, curl sur /rest/v1/
# rendait 401 (réponse normale de PostgREST sans apikey, donc tunnel ouvert), le
# hook journalisait « déposé (2 tours, 1255 octets) » et la ligne était retrouvée
# en base.
#
# ÇA N'A PAS TENU — constaté le 06/08/2026, et c'est la leçon principale de ce
# fichier. Le journal ne contient QUE des échecs depuis ce test : 82 fins de
# session d'affilée en http=000, du 01/08 12:41 au 06/08 21:55, jusqu'à 321 tours
# de Maxence jetés d'un coup. La table session_transcripts ne porte toujours
# qu'une seule ligne : le test manuel du 01/08. Autrement dit, ce hook n'a JAMAIS
# sauvegardé une vraie session.
#
# MESURÉ le 06/08/2026 21:56 UTC depuis le conteneur de session :
#   curl … /rest/v1/  → 000
#   $HTTPS_PROXY/__agentproxy/status → recentRelayFailures:
#     { kind: connect_rejected,
#       detail: "gateway answered 403 to CONNECT (policy denial or upstream failure)",
#       host: "lgvtjqtytwyovllsqbgv.supabase.co:443" }
# Exactement la panne de départ. Le réglage d'environnement n'était donc pas
# acquis pour de bon : soit la session ne tourne pas sur « MaxTask », soit la
# liste de domaines s'est perdue. Seul Maxence peut le corriger.
#
# RÈGLE — une preuve de bon fonctionnement vaut pour l'instant où elle est prise,
# jamais pour la suite. POURQUOI : ici la preuve était bonne et la conclusion
# (« résolu ») fausse dès le lendemain, parce qu'elle portait sur un réglage
# extérieur au dépôt, que rien dans le dépôt ne peut tenir. Ce qui dépend d'un
# réglage qu'on ne contrôle pas doit être RE-VÉRIFIÉ à chaque usage, et son échec
# doit se voir. D'où les deux ajouts du 06/08 : le repli sur disque ci-dessus, et
# l'alerte au démarrage dans cerveau-lecture.sh.
#
# UN http=000 DANS LE JOURNAL DÉSIGNE LE RÉSEAU, JAMAIS LE SCRIPT.
#
# TESTÉ SANS SUCCÈS — un canal de secours par git (plomberie hash-object /
# mktree / commit-tree, puis push d'un commit orphelin sur une branche dédiée)
# a été écrit puis abandonné : le classifieur de sécurité l'a refusé, à raison.
# Un hook qui pousse vers GitHub sans surveillance à chaque fin de session est
# une action sortante non supervisée ; ça demande l'accord explicite de Maxence,
# pas une décision d'agent. Devenu inutile depuis que le domaine est autorisé —
# le correctif était côté environnement, pas côté code.
# ─────────────────────────────────────────────────────────────────────────────
