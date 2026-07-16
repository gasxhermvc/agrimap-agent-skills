# Subagent handoff

- Status: `completed|partial|blocked`
- Requested by: {{requested_by}}
- Model label: {{model_label}}
- Actual model: {{actual_model_or_unknown}}
- Role: {{role}}
- Agent: {{agent_name}}
- Provider: {{provider}}
- Display label: {{display_label}}
- Native thread ID: {{native_thread_id_or_not_exposed}}
- Progress channel: {{native_thread_or_explicit_fallback_path}}
- Branch/commit: {{branch_or_commit}}

## Summary

{{summary}}

## Files and behavior

{{files_changed_with_symbols}}

{{behavior_changed_or_preserved}}

## Decisions and reasons

{{decisions_and_reasons}}

## Commands and tests

{{commands_tests_results}}

## Remaining risks and memory facts

{{remaining_risks}}

{{memory_facts}}

## Prompt conformance

- Execution prompt: {{prompt_path_and_id}}
- Deviation from prompt: {{none_or_structured_deviation}}
- Integration artifact: {{shared_file_set_commit_or_portable_patch}}

- Checkpoint target: `.agrimap-agent/memory/current/{{task_id}}.md`
