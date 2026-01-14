# Design Partner Guide

Thank you for being a design partner! This guide helps you get started with Faramesh and provide valuable feedback.

## What is a Design Partner?

Design partners are early adopters who:
- Test Faramesh in real-world scenarios
- Provide feedback on features and usability
- Help shape the product roadmap
- Get early access to new features

---

## Getting Started

### 1. Installation

```bash
# Clone repository
git clone https://github.com/faramesh/faramesh-core.git
cd faramesh

# Install
pip install -e ".[cli]"

# Initialize project
faramesh init
```

### 2. Start the Server

```bash
# Start with demo data
FARAMESH_DEMO=1 faramesh serve

# Or start normally
faramesh serve
```

### 3. Access the UI

Open `http://127.0.0.1:8000` in your browser.

### 4. Test the Flow

```python
from faramesh import configure, submit_action

configure(base_url="http://127.0.0.1:8000")

action = submit_action(
    agent_id="test-agent",
    tool="shell",
    operation="run",
    params={"cmd": "echo hello"}
)

print(f"Action {action['id']} status: {action['status']}")
```

---

## Typical Workflows

### Workflow 1: Agent Integration

1. **Integrate SDK** into your agent code
2. **Wrap tools** with Faramesh governance
3. **Submit actions** and handle approval workflow
4. **Monitor in UI** for approvals and execution

**Example:**
```python
from faramesh import configure, submit_action, wait_for_completion

configure(base_url="http://127.0.0.1:8000")

def execute_with_governance(cmd: str):
    action = submit_action("my-agent", "shell", "run", {"cmd": cmd})
    
    if action['status'] == 'pending_approval':
        final = wait_for_completion(action['id'], timeout=300.0)
        if final['status'] == 'denied':
            raise PermissionError("Action denied")
        action = final
    
    if action['status'] in ('allowed', 'approved'):
        # Execute command
        import subprocess
        result = subprocess.run(cmd, shell=True)
        return result
```

### Workflow 2: Policy Testing

1. **Create policy** in `policies/default.yaml`
2. **Test with playground**: `http://127.0.0.1:8000/playground`
3. **Validate policy**: `faramesh policy-validate policies/default.yaml`
4. **Test with real actions** and iterate

### Workflow 3: Approval Management

1. **Submit actions** via SDK or API
2. **Monitor in UI** for pending approvals
3. **Approve/deny** via UI or CLI
4. **Review event timeline** for audit trail

---

## Providing Feedback

### What We're Looking For

1. **Usability Issues**
   - Is the UI intuitive?
   - Are CLI commands clear?
   - Is the SDK easy to use?

2. **Feature Gaps**
   - What's missing?
   - What would make your workflow easier?
   - What integrations do you need?

3. **Performance Issues**
   - Is the server fast enough?
   - Are there bottlenecks?
   - Any scalability concerns?

4. **Documentation**
   - Is documentation clear?
   - What's missing?
   - What examples would help?

### How to Report

**GitHub Issues:**
- [Create an issue](https://github.com/faramesh/faramesh-core/issues/new)
- Use appropriate labels (bug, feature, documentation)
- Include steps to reproduce

**Email:**
- design-partners@faramesh.io (if available)
- Include context about your use case

**Discussions:**
- [GitHub Discussions](https://github.com/faramesh/faramesh-core/discussions)
- Share experiences and ask questions

---

## Common Use Cases

### Use Case 1: CI/CD Pipeline Governance

Govern automated deployments and infrastructure changes:

```yaml
# policies/default.yaml
rules:
  - match:
      tool: "shell"
      op: "*"
      pattern: "kubectl apply|terraform apply|ansible-playbook"
    require_approval: true
    description: "Infrastructure changes require approval"
    risk: "high"
```

### Use Case 2: Customer Support Bot

Govern customer support actions (refunds, account changes):

```yaml
rules:
  - match:
      tool: "stripe"
      op: "refund"
      amount_gt: 100
    require_approval: true
    description: "Large refunds require approval"
    risk: "high"
```

### Use Case 3: Content Management

Govern content publishing and social media:

```yaml
rules:
  - match:
      tool: "http"
      method: "POST"
    require_approval: true
    description: "Content posting requires approval"
    risk: "medium"
```

---

## Testing Checklist

### Basic Functionality

- [ ] Server starts successfully
- [ ] UI loads and displays actions
- [ ] Can submit actions via SDK
- [ ] Can submit actions via API
- [ ] Actions appear in UI
- [ ] Can approve/deny actions
- [ ] Event timeline works
- [ ] Policy evaluation works

### Integration

- [ ] SDK integrates with your agent
- [ ] Framework integration works (LangChain, CrewAI, etc.)
- [ ] Approval workflow works end-to-end
- [ ] Error handling is appropriate

### Policy

- [ ] Can create custom policies
- [ ] Policy validation works
- [ ] Policy hot reload works (if using)
- [ ] Risk scoring works
- [ ] Policy packs are useful

### Production Readiness

- [ ] PostgreSQL works (if using)
- [ ] Authentication works
- [ ] Metrics endpoint works
- [ ] Health checks work
- [ ] Error handling is robust

---

## Resources

### Documentation

- [Quick Start](../QUICKSTART.md) - Getting started guide
- [API Reference](API.md) - REST API endpoints
- [CLI Reference](CLI.md) - Command-line interface
- [Policy Configuration](POLICIES.md) - Policy file format
- [Framework Integrations](INTEGRATIONS.md) - Integration guides

### Examples

- [LangChain Example](../examples/langchain/) - LangChain integration
- [CrewAI Example](../examples/crewai/) - CrewAI integration
- [AutoGen Example](../examples/autogen/) - AutoGen integration
- [Docker Example](../docker-compose.yaml) - Docker setup

### Support

- **GitHub Issues**: [Create an issue](https://github.com/faramesh/faramesh-core/issues/new)
- **GitHub Discussions**: [Join discussions](https://github.com/faramesh/faramesh-core/discussions)
- **Email**: design-partners@faramesh.io (if available)

---

## Next Steps

1. **Set up your environment** - Follow [Quick Start](../QUICKSTART.md)
2. **Integrate with your agent** - See [Framework Integrations](INTEGRATIONS.md)
3. **Create custom policies** - See [Policy Configuration](POLICIES.md)
4. **Test workflows** - Use the UI and CLI to test approval flows
5. **Provide feedback** - Report issues, suggest features, share experiences

---

## Thank You!

Your feedback is invaluable in making Faramesh better. We appreciate your time and input!
