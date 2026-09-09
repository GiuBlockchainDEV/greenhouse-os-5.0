# Security & Redaction Policy

[[Home]] · [[00-IP-Deposit-Cover]]

---

## Purpose

This policy defines what information is **included** and **excluded** from the GreenhouseOS IP Knowledge Vault to ensure the document can be safely deposited, shared with IP attorneys, or submitted to registration authorities without creating security vulnerabilities or disclosing competitive secrets.

---

## Included (Safe for IP Deposit)

| Category | Examples |
|----------|----------|
| Architecture diagrams | System topology, data flow, module relationships |
| Algorithm descriptions | FAO-56 formulas, energy balance equations, VPD/DLI math |
| Module registry | File paths, responsibilities, line counts |
| API contracts | Endpoint paths, request/response shapes (no auth tokens) |
| Database schema | Table structures, column types, RLS policies |
| Technology stack | Framework names, language versions |
| Milestone history | Feature delivery timeline |
| License terms | BUSL-1.1 summary and change date |
| Physical constants | Published engineering coefficients |
| i18n structure | Locale codes and namespace names |

---

## Excluded (Never in This Vault)

### Credentials & Secrets

| Item | Reason |
|------|--------|
| API keys (Gemini, OpenAI, Anthropic) | Authentication bypass risk |
| Supabase service role key | Full database access |
| Supabase anon key (production) | Tied to production project |
| JWT tokens, session cookies | Session hijacking |
| Database passwords | Direct data access |
| Docker registry credentials | Supply chain risk |

**Environment variable names** (e.g., `GEMINI_API_KEY`, `SUPABASE_URL`) may be referenced; **values are never documented**.

### Infrastructure Details

| Item | Reason |
|------|--------|
| Production hostnames / URLs | Attack surface enumeration |
| Server IP addresses | Direct targeting |
| CDN configurations | Infrastructure mapping |
| SSL certificate details | Certificate pinning bypass |
| Load balancer rules | Traffic manipulation |
| Container orchestration secrets | Cluster compromise |

### Business-Sensitive Data

| Item | Reason |
|------|--------|
| Customer names, emails, accounts | GDPR / privacy |
| Pricing strategy | Competitive intelligence |
| Unreleased roadmap | Market positioning |
| Partnership agreements | Legal confidentiality |
| Revenue figures | Financial disclosure |

### Full Source Code

| Item | Reason |
|------|--------|
| Complete file contents | Enables unauthorized reproduction |
| Proprietary algorithm implementations | Trade secret protection |

This vault describes **what** the software does and **how** it is architected, not the full executable source. Source remains under BUSL-1.1 license control.

---

## Redaction Verification Checklist

Before distributing this document, verify:

- [ ] No `.env` file contents are included
- [ ] No API keys or tokens appear anywhere
- [ ] No production URLs or IP addresses
- [ ] No customer or user data
- [ ] No full source code listings
- [ ] Example JSON uses fictional/generic coordinates only
- [ ] Environment variable **names** only, never values

---

## Safe Example Data

All example coordinates, temperatures, and simulation parameters in this vault use **generic demonstration values** (e.g., Rome coordinates 41.9028°N, 12.4964°E) that do not correspond to any real customer installation.

---

## Incident Response

If this vault is found to contain inadvertently included secrets:

1. Immediately rotate all exposed credentials
2. Regenerate the vault with updated redaction
3. Revoke previously distributed copies
4. Audit access logs for the affected services

---

*Continue to [[11-Module-Index]]*
