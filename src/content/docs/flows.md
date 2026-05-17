---
title: What are the three stack workflows?
---

## First setup

`faramesh init` → edit `governance.fms` → `faramesh check` → `faramesh plan` → `faramesh apply` → `faramesh status`

## Change policy

Edit `governance.fms` → `faramesh check` → `faramesh plan` → review diff → `faramesh apply`

## Monitor

`faramesh status` → `faramesh approvals list` → `faramesh audit tail` → `faramesh explain <record_id>`

Next: [CLI reference](/cli/).
