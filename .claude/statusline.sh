#!/bin/bash
# Claude Code Status Line
# Uses TypeScript module for logic, bash for git branch detection

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Read JSON input from stdin
input=$(cat)

# Get git branch if in a git repository
GIT_BRANCH="no branch"
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    [ -n "$BRANCH" ] && GIT_BRANCH="$BRANCH"
fi

# Use bun to run the TypeScript module
cd "$PROJECT_DIR" && bun -e "
const { processStatusLine } = require('./lib/statusline.ts');
const input = process.argv[1];
const branch = process.argv[2];
console.log(processStatusLine(input, branch));
" "$input" "$GIT_BRANCH"
