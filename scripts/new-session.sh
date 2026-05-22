#!/usr/bin/env bash
# ============================================================
# moovx-new-session — Démarrage de session Claude avec contexte
# ============================================================
# Assemble : CLAUDE.md + dernière session SESSION_LOG.md +
# état Git (HEAD, 5 derniers commits, working tree) en un
# prompt prêt à coller, copié dans le clipboard via pbcopy.
#
# Usage :
#   moovx-new-session
#
# Une fois copié, colle dans la nouvelle conversation Claude.
# ============================================================

set -e

# Vérifier qu'on est dans le repo plateforme-coach
if [[ ! -f "CLAUDE.md" ]] || [[ ! -d ".git" ]]; then
  echo "❌ Erreur : ce script doit être lancé depuis la racine du repo plateforme-coach"
  echo "   (CLAUDE.md ou .git non trouvés)"
  exit 1
fi

# Vérifier que pbcopy est disponible (macOS)
if ! command -v pbcopy &> /dev/null; then
  echo "❌ Erreur : pbcopy non disponible. Ce script est pour macOS."
  exit 1
fi

# Variables
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
GIT_HEAD=$(git log -1 --oneline 2>/dev/null || echo "(no commits)")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(no branch)")
GIT_LAST5=$(git log --oneline -5 2>/dev/null || echo "(no commits)")
GIT_STATUS=$(git status --short 2>/dev/null || echo "(clean)")
if [[ -z "$GIT_STATUS" ]]; then
  GIT_STATUS="(working tree clean)"
fi

# Extraire la session la plus récente de SESSION_LOG.md
# Logique : trouver la 1ère ligne "## YYYY-MM-DD" et tout
# capturer jusqu'à la prochaine ligne "## YYYY-MM-DD" ou EOF
SESSION_LOG_PATH="docs/SESSION_LOG.md"
LATEST_SESSION=""
if [[ -f "$SESSION_LOG_PATH" ]]; then
  LATEST_SESSION=$(awk '
    /^## [0-9]{4}-[0-9]{2}-[0-9]{2}/ {
      if (count == 0) { capture = 1 }
      else { exit }
      count++
    }
    capture { print }
  ' "$SESSION_LOG_PATH")
fi

# Lire CLAUDE.md
CLAUDE_MD=""
if [[ -f "CLAUDE.md" ]]; then
  CLAUDE_MD=$(cat CLAUDE.md)
fi

# Assembler le prompt
PROMPT=$(cat << PROMPT_END
Salut Claude, je suis Marco. Je travaille sur MoovX, plateforme de coaching fitness suisse.

Avant de commencer, lis ce contexte complet :

═══════════════════════════════════════════════════════════════
📋 CONTEXTE PROJET (CLAUDE.md)
═══════════════════════════════════════════════════════════════

$CLAUDE_MD

═══════════════════════════════════════════════════════════════
📜 DERNIÈRE SESSION (SESSION_LOG.md)
═══════════════════════════════════════════════════════════════

$LATEST_SESSION

═══════════════════════════════════════════════════════════════
🔧 ÉTAT GIT ACTUEL ($TIMESTAMP)
═══════════════════════════════════════════════════════════════

Branche : $GIT_BRANCH
HEAD : $GIT_HEAD

5 derniers commits :
$GIT_LAST5

Working tree :
$GIT_STATUS

═══════════════════════════════════════════════════════════════

Confirme rapidement :
1. Tu as bien lu et compris la philosophie de travail ?
2. Quelle est la dernière phase complétée ?
3. Quel est le anti-pattern n1 a NE JAMAIS faire ?

Une fois confirme, dis-moi et je te donnerai la tache du jour.
PROMPT_END
)

# Copier dans le clipboard
echo "$PROMPT" | pbcopy

# Confirmation utilisateur
PROMPT_LINES=$(echo "$PROMPT" | wc -l | tr -d ' ')
echo "✅ Prompt MoovX assemble et copie dans le clipboard"
echo ""
echo "   Branche  : $GIT_BRANCH"
echo "   HEAD     : $GIT_HEAD"
echo "   Lignes   : $PROMPT_LINES"
echo ""
echo "📋 Colle maintenant (Cmd+V) dans une nouvelle conversation Claude."
