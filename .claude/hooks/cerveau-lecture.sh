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
# puisqu'il est lu avec confiance. Plus aucun hook ne le rappelle depuis le
# 01/08/2026 (voir ci-dessous) : c'est à l'agent d'y penser en fin de session.
#
# CE HOOK EST LE SEUL QUI RESTE. Un hook Stop imposait aussi l'écriture au
# cerveau ; Maxence l'a fait retirer le 01/08/2026 — il ne voulait pas être
# bloqué en fin de session. Conséquence assumée : la lecture est mécanique,
# l'écriture redevient une discipline. Si les souvenirs se mettent à manquer,
# c'est la première cause à regarder, et l'historique du hook retiré est dans
# git (fichier .claude/hooks/check-cerveau.sh, jusqu'au commit 7442fee).

set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

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
