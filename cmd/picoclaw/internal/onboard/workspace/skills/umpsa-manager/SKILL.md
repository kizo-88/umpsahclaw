---
name: umpsa-manager
description: "Specialized skill for managing the UMPSA HOLDING automation project. This skill focuses on organizing code, tracking automation tasks, and maintaining the project structure."
---

# UMPSA Manager Skill

A specialized skill for managing the **UMPSA HOLDING** automation project. This skill focuses on organizing code, tracking automation tasks, and maintaining the project structure.

## Identity
- **Name**: UMPSA Manager
- **Version**: 1.0.0
- **Author**: Antigravity
- **Description**: Specialized automation for UMPSA project management and local workflow orchestration.

## Capabilities
- **Project Indexing**: Keeping track of all scripts and automations in the UMPSA folder.
- **News Scraping**: Running `go run workspace/scripts/scrape_umpsa.go` to update local UMPSA Holding news.
- **Task Management**: Creating and updating task lists specific to the UMPSA workflow.
- **Structure Enforcement**: Ensuring all new files follow the specified UMPSA organizational patterns.

## Instructions
1. **Always reference the root**: The project root is `C:\Users\maste\Documents\.WORK\UMPSA HOLDING\.CODE\AUTOMATION\PICOCLAW`.
2. **Work within Workspace**: All non-system files should be stored in the `workspace/` subdirectory.
3. **Task Tracking**: Maintain a `TASKS.md` in the workspace root to track automation progress.

## Tools used
- `filesystem`: For reading and writing files.
- `shell`: For running local verification scripts.

## Prompt Examples
- "Initialize the UMPSA project task list."
- "Organize my new automation scripts into the correct subfolders."
- "Show me the status of all UMPSA holding automations."
