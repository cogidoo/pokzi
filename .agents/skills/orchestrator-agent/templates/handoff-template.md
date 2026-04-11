# Shared Handoff Template

Use this template for orchestrated handoffs between specialist skills.

```yaml
task_type:
goal:
scope_in:
scope_out:
constraints:
assumptions:
risks:
acceptance_criteria:
affected_surfaces:
findings:
evidence:
patch_plan:
changed_files:
tests:
severity:
review_status:
next_step:
```

## Usage Notes

- Keep values concrete and short.
- Empty lists are acceptable when the field is required but currently has no entries.
- Do not replace `scope_out` with vague wording such as "TBD".
- `review_status` should be omitted until a review step exists.
- `severity` is only required for findings.
