---
title: Use cases
description: Concrete scenarios where teams put Faramesh in production, payments agents, support bots, internal automation, coding agents, multi-tenant SaaS, regulated industries.
---

Faramesh exists to solve one problem: an agent that can call real tools needs deterministic enforcement before it does anything consequential. Below are the scenarios we see in production, with the policy patterns each one demands.

## 1. Payments and money movement

**The problem.** A payments agent can charge cards, issue refunds, push payouts to bank accounts. Anything the agent calls becomes irreversible the moment it executes.

**Faramesh pattern.**

```hcl title="governance.fms"
agent "payments-bot" {
  default deny

  rules {
    permit stripe/charge       if amount < $500
    defer  stripe/charge       if amount >= $500
    permit stripe/refund       if amount < $100
    defer  stripe/refund       if amount >= $100
    deny   stripe/payouts
    permit stripe/customers/*  method GET
  }

  rate_limit "stripe/charge":  20 per minute
  rate_limit "stripe/refund":  30 per hour

  redact stripe/charge args: ["card_number", "cvv", "card_holder"]

  budget daily {
    max       $50000
    warn_at   0.8
    on_exceed deny
  }

  alert {
    on     = "deny"
    notify = "slack://#payments-security"
  }
}
```

**What this gives you.**

- A hard ceiling on per-call dollars without writing code in the agent.
- Automatic human approval for any anomalous charge.
- Audit chain you can hand to a PCI auditor.
- Card numbers never make it to logs.

## 2. Customer support agents

**The problem.** Support agents read CRM data, send emails, and occasionally take action on customer accounts (cancellations, refunds, plan changes). The blast radius of a wrong action is contained but real.

**Faramesh pattern.**

```hcl title="governance.fms"
agent "support-bot" {
  default deny

  rules {
    permit crm/customers/read
    permit crm/tickets/*       method GET
    permit crm/tickets/create
    permit email/send          if domain == "@yourcompany.com"
    defer  email/send          if domain != "@yourcompany.com"
    defer  billing/cancel_subscription
    deny   billing/delete_account
  }

  redact email/send args: ["body"]

  rate_limit "email/send": 50 per hour

  budget daily {
    max       $20
    on_exceed defer
  }
}
```

**What this gives you.**

- Email blasts limited to your own domain by default; external emails go to a human.
- Subscription cancellations require a click.
- Deletion is impossible without editing the policy.

## 3. Coding agents

**The problem.** A coding agent (Claude Code, Cursor, your own) reads files, runs commands, edits source, and can blow away an entire repo with one bad shell call.

**Faramesh pattern.**

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/mcp@1.0.0"

runtime {
  mcp_proxy_port = 8081
}

agent "ide-coding-agent" {
  default deny

  rules {
    permit fs_read
    permit search_codebase
    permit run_tests
    permit git/status
    permit git/diff
    permit fs_write           if path matches "^(src|tests)/"
    defer  fs_write           if path matches "^(infra|deploy)/"
    deny   shell_exec
    defer  git/push
    deny   git/force_push
  }

  egress {
    allow = ["github.com", "registry.npmjs.org", "pypi.org"]
  }
}
```

**What this gives you.**

- The agent can read everything but can only edit code, not infrastructure manifests.
- Shell execution is off; the agent gets `run_tests` instead.
- No accidental `git push --force`.

## 4. Internal automation

**The problem.** An agent that talks to your internal services (Jira, Slack, GitHub, the deploy pipeline). A bug means the agent files 500 tickets, posts to the wrong channel, or deploys to prod at 3 AM.

**Faramesh pattern.**

```hcl title="governance.fms"
agent "internal-ops" {
  default deny

  rules {
    permit jira/issues/search
    permit jira/issues/get
    permit jira/issues/create   if priority in ["low", "medium"]
    defer  jira/issues/create   if priority == "high"
    deny   jira/issues/create   if priority == "blocker"

    permit slack/post   if channel in ["#ops-bot", "#alerts-dev"]
    deny   slack/post   if channel == "#general"

    permit github/issues/*
    defer  github/pull_requests/merge
    deny   github/branches/delete

    deny   deploy/promote
    defer  deploy/rollback
  }

  rate_limit "jira/issues/create": 30 per hour
  rate_limit "slack/post":         60 per hour

  alert {
    on     = "deny"
    notify = "slack://#ops-bot"
  }
}
```

**What this gives you.**

- Bounded creation rates so a runaway loop can't flood Jira.
- No production deploys from the agent; rollbacks need a human.
- Slack posts confined to bot channels.

## 5. Data analyst agents

**The problem.** An agent runs SQL against a warehouse. Wrong SQL can lock tables, scan terabytes, or read PII the requester shouldn't see.

**Faramesh pattern.**

```hcl title="governance.fms"
agent "analyst-bot" {
  default deny

  rules {
    permit sql/query   if statement matches "^SELECT" and tables.contains_pii == false
    defer  sql/query   if tables.contains_pii == true
    deny   sql/query   if statement matches "(?i)\\b(DROP|TRUNCATE|DELETE|UPDATE|GRANT)\\b"

    permit warehouse/save_result_to_s3
    deny   warehouse/copy_to_external
  }

  rate_limit "sql/query": 100 per hour

  budget daily {
    max       $200
    on_exceed defer
  }
}
```

The condition matcher reads structured metadata your warehouse exposes through a [selector](/fpl/#conditions): `tables.contains_pii` is resolved at evaluation time against a cached lookup. PII queries always go to a human.

## 6. Multi-tenant SaaS agents

**The problem.** You operate an agent that serves many customers. Each customer should never see another's data or actions. A bug or jailbreak can't be allowed to cross the tenant line.

**Faramesh pattern.** One stack per tenant (the recommended layout) **or** one agent per tenant with tenant-scoped credentials.

```hcl title="governance.fms"
agent "acme/support-bot" {
  default deny

  rules {
    permit crm/customers/read   if customer.tenant == principal.tenant
    deny   crm/customers/read   if customer.tenant != principal.tenant

    permit email/send           if to.domain == "@acme.com"
  }

  alert {
    on     = "deny"
    notify = "pagerduty://tenant-isolation"
  }
}
```

`principal.tenant` is provided by the SPIFFE identity at the daemon boundary. The condition `customer.tenant == principal.tenant` is the cross-tenant trip wire; every violation pages the on-call.

## 7. Regulated workloads (HIPAA, SOC 2, PCI)

**The problem.** Agents in regulated environments need three things auditors can verify: deterministic enforcement, evidence of every decision, and credential hygiene.

**Faramesh pattern.**

```hcl title="governance.fms"
runtime {
  mode    = "enforce"
  backend = "postgres"
}

provider "kms-aws" {
  type    = "aws-kms"
  region  = "us-east-1"
  key_arn = env("FARAMESH_KMS_KEY_ARN")
}

provider "audit-splunk" {
  type  = "splunk-sink"
  url   = env("SPLUNK_URL")
  token = env("SPLUNK_HEC_TOKEN")
  index = "faramesh-decisions"
}

agent "claims-bot" {
  default deny

  rules {
    permit ehr/records/read    if principal.role == "claims_examiner"
    permit ehr/records/write   if principal.role == "claims_examiner" and principal.mfa == true
    deny   ehr/records/delete
    defer  payments/issue_check
  }

  redact ehr/records/read   args: ["ssn", "dob", "diagnosis_codes"]
  redact ehr/records/write  args: ["ssn", "dob"]
}
```

**Evidence pipeline.**

- KMS signs every DPR, chain non-repudiation.
- Audit sink to Splunk for SIEM and retention.
- `faramesh audit verify` walks the WAL on demand for audit cycles.
- `faramesh audit export --from --to` produces per-decision CSV for evidence requests.

See [Auditing](/concepts/auditing/) for the compliance affordances.

## 8. Autonomous web agents

**The problem.** Agents that browse the open web (search, scrape, file-uploads) need a hard boundary on what they're allowed to fetch and where they can send anything.

**Faramesh pattern.**

```hcl title="governance.fms"
agent "research-bot" {
  default deny

  rules {
    permit browser/navigate  if host in ["en.wikipedia.org", "duckduckgo.com"]
    deny   browser/navigate  if host matches "(?i)(porn|gambling|warez)"
    permit browser/scrape
    permit browser/screenshot
    defer  browser/upload
    deny   browser/download  if size_mb > 100
  }

  egress {
    allow = ["en.wikipedia.org", "duckduckgo.com", "*.wikimedia.org"]
  }

  budget daily {
    max       $30
    on_exceed deny
  }
}
```

**What this gives you.**

- Bounded crawl. The agent literally cannot reach hosts outside the allow list.
- No file uploads without human approval.
- Daily dollar ceiling on browsing cost.

## Patterns across use cases

You'll notice the same building blocks recur:

- **`default deny` + explicit `permit`** instead of an allow-everything policy.
- **`defer` for the things you don't want a human chasing** in a Slack thread.
- **`rate_limit`** to bound runaway loops.
- **`budget`** as a cost ceiling that doesn't require code in the agent.
- **`redact`** for any field auditors would care about.
- **`egress`** for any agent that touches the network.
- **`alert`** for the security-team-needs-to-know moments.

A first draft of `governance.fms` for a new agent usually takes 30 minutes. The rest of the time is tightening the rules as you see what your agent actually wants to do.

## What's next

- [Quickstart](/quickstart/): wire any of these patterns end-to-end
- [Stack reference](/stack/): every block in `governance.fms`
- [FPL reference](/fpl/): the conditions and effects
- [Frameworks](/frameworks/): agent runtimes Faramesh integrates with today
