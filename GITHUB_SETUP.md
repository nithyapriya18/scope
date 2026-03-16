# GitHub Setup - PetaSight Remote

## Current Configuration

```
Local Repository: /home/nithya/app-lumina-scope
Main Branch: main (tracking petasight/main)

Remotes:
├─ petasight (DEFAULT)
│  └─ https://github.com/petasight/lumina_scope_dontdelete.git
│
└─ origin (backup)
   └─ https://github.com/nithyapriya18/scope.git
```

## Latest Commit

**Commit**: 515af155749d235df28250ce711e34d16d7e6146
**Message**: feat: implement template-based RFP analysis system
**Files Changed**: 23
**Insertions**: 1391

## Common Git Commands

### Pull Latest (from PetaSight)
```bash
git pull
# Equivalent to: git fetch petasight && git merge petasight/main
```

### Push Changes (to PetaSight)
```bash
git push
# Equivalent to: git push petasight main
```

### Check Status
```bash
git status
git branch -vv  # Shows tracking info
```

### View Commit History
```bash
git log --oneline -10
git show 515af15  # Show latest commit details
```

### Manual Fetch/Merge
```bash
git fetch petasight
git merge petasight/main
```

## Backup to Personal Repo

To keep your personal GitHub repo in sync:

```bash
git push origin main
# This pushes to https://github.com/nithyapriya18/scope.git
```

## Clone Fresh Copy

If you need a fresh copy later:

```bash
git clone https://github.com/petasight/lumina_scope_dontdelete.git
cd lumina_scope_dontdelete
```

## What's in the Repo

Latest push (commit 515af15) includes:

**New/Modified Backend**:
- assumptionAnalyzerAgent.ts (NEW)
- briefExtractorAgent.ts (Enhanced - template mapping)
- gapAnalyzerAgent.ts (Enhanced - template-aware gaps)
- orchestratorAgent.ts (Updated - workflow integration)

**New Database**:
- assumption_analyses table (NEW)
- Migration: a1b2c3d4e5f6_add_assumption_analyses_table.py

**Documentation**:
- TEMPLATE_ANALYSIS_GUIDE.md
- NEXT_STEPS.md
- This file (GITHUB_SETUP.md)

**Frontend**:
- Dashboard, Auth, Components (updated with various improvements)

## Troubleshooting

**If you get "permission denied" on push**:
- Check GitHub authentication: `git config --list | grep github`
- Ensure you have write access to petasight/lumina_scope_dontdelete.git

**If main branch diverges**:
```bash
git fetch petasight
git status  # Check what's different
git reset --hard petasight/main  # Discard local changes and sync
```

**If you need to switch back to origin**:
```bash
git branch -u origin/main main
git pull  # Will now pull from origin
```

## Continuous Development Workflow

```
1. git pull                          # Get latest from petasight
2. Make local changes
3. git add .
4. git commit -m "description"
5. git push                          # Push to petasight
6. Optional: git push origin main    # Backup to personal repo
```

## Team Collaboration

The PetaSight repo is the source of truth:
- **Single remote**: petasight/main
- **No conflicts**: Always pull before making changes
- **Clear history**: Linear commits with good messages
- **Documentation**: Each commit includes summary and file list

For team members:
```bash
git clone https://github.com/petasight/lumina_scope_dontdelete.git
cd lumina_scope_dontdelete
git pull  # Get any updates
# Make changes...
git push  # Share with team
```

---

**Current Status**: ✅ Ready for team collaboration
**Last Updated**: 2026-03-16 (Commit 515af15)
**Database**: lumina_scope on localhost (PostgreSQL)
