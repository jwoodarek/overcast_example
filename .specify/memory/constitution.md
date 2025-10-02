<!--
Sync Impact Report:
Version change: [NEW] → 1.0.0
Modified principles: [NEW CONSTITUTION]
Added sections: All sections (new constitution)
Removed sections: None (new constitution)
Templates requiring updates:
- ✅ .specify/templates/plan-template.md (constitution check section)
- ✅ .specify/templates/spec-template.md (requirements alignment)
- ✅ .specify/templates/tasks-template.md (task categorization)
- ✅ .specify/templates/agent-file-template.md (code style alignment)
Follow-up TODOs: None
-->

# Overcast Constitution

## Core Principles

### I. Simplicity First
Code MUST prioritize readability and maintainability over cleverness. Every solution starts with the simplest approach that works. Complex patterns are only introduced when simple solutions prove insufficient, and the complexity MUST be justified in comments or documentation.

**Rationale**: Newcomers to full-stack development need clear, understandable code to learn from. Complex abstractions create barriers to understanding and maintenance.

### II. Single File Preference
Features MUST be implemented in as few files as possible without sacrificing clarity. Related functionality stays together unless separation provides clear organizational benefits. Avoid creating excessive file hierarchies or splitting simple logic across multiple modules.

**Rationale**: Reduces cognitive overhead for developers navigating the codebase. Easier to understand complete functionality when it's contained in fewer locations.

### III. Comment-Driven Development
All non-trivial code MUST include explanatory comments. Comments explain WHY decisions were made, not just WHAT the code does. Complex business logic, algorithm choices, and architectural decisions require detailed explanations accessible to junior developers.

**Rationale**: Comments serve as teaching tools for newcomers and prevent knowledge loss when team members change.

### IV. Newcomer-Friendly Architecture
Code structure and naming MUST be immediately understandable to developers with basic full-stack knowledge. Avoid domain-specific jargon, overly abstract patterns, or implicit conventions. When advanced patterns are necessary, include educational comments explaining the concept.

**Rationale**: Ensures the codebase remains accessible as a learning resource and reduces onboarding time for new team members.

### V. Test-Driven Clarity
Tests MUST serve as living documentation and examples. Test names clearly describe scenarios in plain language. Test code follows the same simplicity and commenting principles as production code. Integration tests demonstrate complete user workflows.

**Rationale**: Tests become the primary documentation for how features work, especially valuable for newcomers understanding system behavior.

## Development Standards

### Code Organization
- Components and utilities stay in single files until they exceed 300 lines
- Related functions group together with clear section comments
- File names use descriptive, full words (no abbreviations)
- Directory structure mirrors user-facing feature organization

### Documentation Requirements
- Every public function includes JSDoc with examples
- Complex algorithms include step-by-step comment explanations
- README files explain setup and common workflows in beginner-friendly language
- Architecture decisions documented with rationale and alternatives considered

### Technology Constraints
- Prefer standard library solutions over external dependencies
- When dependencies are added, document why they're necessary and how they work
- Avoid bleeding-edge features that lack widespread documentation
- Choose tools with strong community support and learning resources

## Governance

### Amendment Process
Constitution changes require documentation of the problem being solved and why existing principles are insufficient. All amendments must maintain focus on newcomer accessibility and code simplicity.

### Compliance Review
Every pull request MUST verify adherence to simplicity and commenting principles. Code reviews prioritize educational value and maintainability over performance optimizations unless performance requirements are clearly documented.

### Violation Handling
Complexity that violates these principles requires explicit justification in code comments and documentation. The justification must explain why simpler alternatives were insufficient and include learning resources for the concepts used.

**Version**: 1.0.0 | **Ratified**: 2025-10-02 | **Last Amended**: 2025-10-02