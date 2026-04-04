#!/bin/bash

echo "Setting up AI tool symlinks..."

TOOLS=(".claude" ".codex" ".gemini" ".agent")
DIRS=("agents" "skills" "workflows")

for tool in "${TOOLS[@]}"; do
  mkdir -p $tool
  for dir in "${DIRS[@]}"; do
    TARGET="../.ai/$dir"
    LINK="$tool/$dir"

    if [ -L "$LINK" ] || [ -e "$LINK" ]; then
      echo "Removing existing $LINK"
      rm -rf "$LINK"
    fi

    ln -s "$TARGET" "$LINK"
    echo "Linked $LINK -> $TARGET"
  done
done

echo "Symlink setup complete."
