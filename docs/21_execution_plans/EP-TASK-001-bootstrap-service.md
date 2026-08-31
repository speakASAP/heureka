# EP-TASK-001-bootstrap-service

completeness_level: complete

status: validated

## Upstream traceability
- `../11_tasks/TASK-001-bootstrap-service.md`
- `../22_goal_impact/GOAL-IMPACT-TASK-001.md`
- `../12_validation/VAL-TASK-001-bootstrap-service.md`

## Scope
- Document the Heureka service boundary, dependency model, and operational intent
- Align the required IPS artifacts and state file to the actual repo reality
- Validate the repo with the central IPS planning checker

## Non-goals
- Turning the service into a product catalog or warehouse authority
- Expanding into payment management or broader commerce ownership
- Modifying the shared IPS governance standard or rollout plan

## Project invariants
- Boundaries must remain truthful and ownership must be explicit.
- The feed-generation contract must be valid and traceable.
- Validation evidence must reflect the actual repo service boundary.

## Sensitive-data handling
No secrets or customer data are introduced into the adoption docs.

## Contract validation plan
Review the service contract for required vs not-applicable capability decisions and preserve the real Heureka boundary with upstream catalog and warehouse dependencies.

## Replay and determinism plan
The task is deterministic because it is derived from the actual repo code, docs, and central validation rules.

## Files to inspect
- README.md
- BUSINESS.md
- SYSTEM.md
- AGENTS.md
- TASKS.md
- STATE.json
- relevant docs and operational metadata already present in the repo

## Files to create
- `ips-adoption.json`
- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/06_architecture/INTEGRATION_CONTRACT.md`
- `docs/11_tasks/TASK-001-bootstrap-service.md`
- `docs/12_validation/VAL-TASK-001-bootstrap-service.md`
- `docs/17_governance/PROJECT_INVARIANTS.md`
- `docs/21_execution_plans/EP-TASK-001-bootstrap-service.md`
- `docs/22_goal_impact/GOAL-IMPACT-TASK-001.md`
- `docs/orchestrator/VALIDATION_DEBT.md`

## Files to modify
- root doc files where the adoption profile requires truthfully restructuring real content into the IPS format

## Files that must not be modified
- `shared/config/ecosystem-repositories.json`
- the master rollout plan in the IPS repo

## Implementation steps
1. Read the repo’s real business and system docs.
2. Run the scaffold to create any missing adoption artifacts.
3. Rewrite the required root docs and governance files to match the actual Heureka service boundary.
4. Set the required `STATE.json` keys and `ips-adoption.json` capability decisions.
5. Validate the repo with the central IPS planner and fix any remaining issues.

## Parallel execution
This is a single repo onboarding task; no deployment or unrelated runtime changes are included in the current scope.

## Blockers
- The repo must stay honest about upstream ownership and not invent a broader commerce or payment service model.

## Test plan
- Validate the repo with the central IPS planning script.
- Check the service docs remain consistent with the real feed-generation contract and stock-dependency flow.

## Validation plan
- `python3 intent-preservation-system/scripts/validate_adoption_profile.py --root heureka --phase planning`

## Gate commands
- `python3 intent-preservation-system/scripts/validate_adoption_profile.py --root heureka --phase planning`

## Documentation updates
- Update the adoption docs and state file to reflect the real Heureka service model and dependency ownership.

## Rollback plan
- If validation fails, fix the specific missing artifact or placeholder issue and rerun the planner before committing.

## Handoff
The repo remains with a valid adoption profile and explicit service-boundary documentation for the next operational review.

## Completion checklist
- [x] Real service boundary documented
- [x] Required adoption artifacts created or aligned
- [x] Capability decisions reviewed and truthful
- [x] Validator passed in planning phase
- [x] Traceability links included across task, goal impact, execution plan, and validation docs
