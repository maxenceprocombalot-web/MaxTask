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
# dans le dépôt : il survit au recyclage du conteneur, marche hors ligne, et se
# régénère à chaque session (le hook Stop le rappelle).
#
# Il stampe aussi .claude/.session-active, que le hook Stop lit pour savoir
# qu'une session a eu lieu — c'est ce qui fait compter les DISCUSSIONS et pas
# seulement les modifications de code.

set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# Témoin de session : sa date sert de « début de session » au hook Stop
mkdir -p .claude 2>/dev/null
: > .claude/.session-active 2>/dev/null

primer=".claude/cerveau-primer.md"
[ -f "$primer" ] || exit 0

# jq construit le JSON en échappant proprement le markdown (backticks, guillemets,
# accents, sauts de ligne). Sans jq on n'injecte rien plutôt que d'émettre du JSON
# cassé : un hook muet vaut mieux qu'un hook qui fait échouer le démarrage.
command -v jq >/dev/null 2>&1 || exit 0

jq -Rs '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: ("Second cerveau de Maxence — photo au démarrage. Lis-la avant de répondre ; pour toute question précise, interroge le projet Supabase brain-max (lgvtjqtytwyovllsqbgv) via le MCP.\n\n" + .)
  }
}' "$primer"
