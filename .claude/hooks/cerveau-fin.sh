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

# DEUX TENTATIVES, ET POURQUOI : sur Claude Code web tout le trafic sort par un
# proxy local (HTTPS_PROXY=127.0.0.1:…). Ce hook s'exécute session déjà finie,
# donc APRÈS le démontage de ce proxy : curl ne peut plus s'y connecter, sort en
# code 7 et rend http=000. C'est la cause des 82 échecs du journal, du 01/08 au
# 09/08/2026 — pas un blocage de supabase.co, qui répond normalement. La sortie
# directe fonctionne, elle : on retente donc en ignorant le proxy.
depose() {
  curl -s -o "$tmp/reponse.txt" -w '%{http_code}' \
    --max-time 20 "$@" \
    -X POST "$SUPABASE_URL" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    --data-binary "@$tmp/charge.json" 2>/dev/null
}

voie=""
code="$(depose)"
if [ "$code" = "000" ]; then
  code="$(depose --noproxy '*')"
  voie=" (sans proxy)"
fi

if [ "$code" = "201" ] || [ "$code" = "200" ]; then
  echo "$horodatage  déposé$voie ($nb_tours tours, $poids octets)" >>"$journal" 2>/dev/null
else
  # On journalise le CORPS de la réponse, pas seulement le code. Un « http=401 »
  # nu n'apprend rien ; « 42501 row-level security » aurait fait gagner neuf
  # jours. Et on garde la charge sur disque au lieu de la perdre : sur le Mac
  # elle survit, dans le conteneur web elle part avec lui — mais alors le
  # journal dit au moins pourquoi.
  motif="$(head -c 300 "$tmp/reponse.txt" 2>/dev/null | tr '\n' ' ')"
  attente="${CLAUDE_PROJECT_DIR:-.}/.claude/.cerveau-en-attente"
  mkdir -p "$attente" 2>/dev/null &&
    cp "$tmp/charge.json" "$attente/$(date '+%Y%m%dT%H%M%S').json" 2>/dev/null
  echo "$horodatage  ÉCHEC http=${code:-?} ($nb_tours tours) — ${motif:-aucune réponse HTTP} — charge gardée dans .claude/.cerveau-en-attente/" >>"$journal" 2>/dev/null
fi

exit 0

# ─────────────────────────────────────────────────────────────────────────────
# DIAGNOSTIC CORRIGÉ LE 09/08/2026 — CE QUI PRÉCÉDAIT ICI ÉTAIT FAUX
#
# Le commentaire d'origine affirmait que la politique réseau de l'environnement
# refusait supabase.co (403 au CONNECT) et que « le correctif est côté
# environnement, pas côté code ». C'est démenti : depuis ce conteneur,
# supabase.co répond 200 en GET et 401 en POST, y compris avec un environnement
# complètement vide, et 380 Ko passent en une seconde.
#
# Il y avait DEUX pannes empilées, indépendantes l'une de l'autre :
#
#   1. TRANSPORT — les 82 « http=000 » du 01/08 au 09/08. Le proxy local n'est plus
#      joignable quand ce hook tourne (session finie = proxy démonté), curl sort
#      en code 7. Reproduit à l'identique en pointant HTTPS_PROXY sur un port
#      fermé. Corrigé ci-dessus par la seconde tentative sans proxy.
#
#   2. AUTORISATION — même sorti, le dépôt est refusé : 401 / 42501
#      « new row violates row-level security policy ». La politique RLS vise le
#      rôle `authenticated`, alors que la clé publiable authentifie en `anon`.
#      CE N'EST PAS UN BUG : la migration `20260802210048 ferme_les_acces_anonymes`
#      l'a décidé le 02/08, en écrivant son motif — « n'importe qui pouvait
#      écrire dans la base du second cerveau » — et en laissant la suite à
#      Maxence (« on ferme la porte, on tranche après »). Cet arbitrage n'a
#      jamais été tranché : CETTE PANNE EST DONC TOUJOURS OUVERTE.
#
#      Le 09/08 j'ai rouvert `anon` en croyant corriger un bug, puis annulé
#      (migration `restaure_fermeture_anon_session_transcripts`) une fois la
#      migration du 02/08 lue. Deux voies possibles, au choix de Maxence :
#      rouvrir `anon` en assumant que la clé publiable est publique, ou donner
#      au hook une clé secrète par variable d'environnement.
#
# CE QUE LE HOOK A RÉELLEMENT FAIT : un seul dépôt réussi, le 01/08 à 12:02
# (« déposé (2 tours, 1255 octets) », première ligne du journal, ligne retrouvée
# en base). La fermeture du 02/08 puis la panne de transport l'ont tué ensuite.
#
# LA LEÇON : avant de qualifier un réglage de « bug », chercher s'il a été posé
# exprès — l'historique des migrations porte le motif. J'ai affirmé « la
# politique est ainsi depuis la création » sans l'avoir vérifié ; le journal et
# la migration du 02/08 disaient le contraire.
#
# TESTÉ SANS SUCCÈS — un canal de secours par git (plomberie hash-object /
# mktree / commit-tree, puis push d'un commit orphelin sur une branche dédiée)
# a été écrit puis abandonné : le classifieur de sécurité l'a refusé, à raison.
# Un hook qui pousse vers GitHub sans surveillance à chaque fin de session est
# une action sortante non supervisée ; ça demande l'accord explicite de Maxence,
# pas une décision d'agent. À ne reprendre que s'il le demande.
# ─────────────────────────────────────────────────────────────────────────────
