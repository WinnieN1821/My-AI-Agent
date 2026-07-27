# Workshop go/no-go checklist

## Current decision: NO-GO

The human pilot has not run. Phase 8 release and course delivery must not begin.
Automated checks can show that the repository behaves consistently, but cannot
prove that non-technical learners can use the instructions independently.

Run the authoritative decision by double-clicking `evaluate-pilot.command` on
macOS or `evaluate-pilot-windows.cmd` on Windows. From a terminal:

```bash
./scripts/evaluate-pilot.sh
```

`GO` and exit code 0 are required. `NO_GO` exits 1 and invalid evidence exits 2.
CI uses `--allow-pending` so unfinished honest evidence does not masquerade as a
failed software build; a completed pilot that misses a criterion still fails.

## Human acceptance gates

- [ ] Pilot is marked complete.
- [ ] At least five participants had no involvement in development.
- [ ] Both macOS and Windows with WSL2 were covered.
- [ ] At least 80% received a real Claude response within 30 minutes.
- [ ] Every participant completed preflight.
- [ ] Every team customised the interface.
- [ ] Every team customised and synced one skill.
- [ ] Every team demonstrated the task read tool.
- [ ] Every team demonstrated an exact-confirmation write.
- [ ] A second team started another team's repository without verbal help.
- [ ] Every instructor intervention was recorded and P0/P1 friction was fixed or
      explicitly mitigated.

## Technical gates

- [x] The latest GitHub Actions run passes contract, static, PowerShell, and all
      Docker smoke jobs.
- [ ] Invalid key, exhausted credit, inactive workflow, occupied port, restart,
      and no-internet scenarios have dated evidence.
- [x] Browser checks pass at 375, 768, and 1440 pixels without horizontal
      overflow or inaccessible controls.
- [x] No secrets, participant identity, local `.env`, backup, or n8n data were
      committed.
- [x] A clean backup and restore drill has passed on the workshop baseline.

GitHub Actions run `30198827506` passed for evidence commit `adff923` on
2026-07-26. The second gate remains open: automated simulations passed, but the
supervised real-account and fully offline checks have not been recorded.

## Decision record

| Field | Value |
| --- | --- |
| Date | Pending |
| Evidence commit | Pending |
| Evaluator decision | `NO_GO` |
| Participants | 0 |
| Response within 30 minutes | 0% |
| Open P0 fixes | Unknown until pilot |
| Open P1 fixes | Unknown until pilot |
| Decision owner | Pending |
| Phase 8 authorised | No |

When all boxes are supported by evidence, commit the completed anonymous result,
record the commit SHA above, and have the workshop owner sign off. Do not change
the decision by editing this document alone.
