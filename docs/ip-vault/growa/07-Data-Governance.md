# Data Governance

[[Home]] · [[06-GAIA-Intelligence]] · [[08-Industrial-Bridge]]

---

## Capability Summary

The **Data Governance** layer manages user identity, greenhouse design persistence, and access control. All data access is enforced at the database level through row-level security policies.

---

## Entity Model (Abstracted)

```text
User ──► Profile ──► Greenhouse Designs
                          │
                          └──► Public visibility (optional)
```

| Entity | Stored Attributes |
|--------|-------------------|
| Profile | Name, company, language preference, AI preferences |
| Greenhouse design | Geometry, covering, crop, location, metadata |

---

## Black-Box Interface

```typescript
/** Data governance — connection details are never documented */
interface DesignRepository {
  list(userId: UserId): GreenhouseDesign[];
  save(userId: UserId, design: GreenhouseDesign): DesignId;
  remove(userId: UserId, designId: DesignId): void;
}
```

---

## Access Control

| Policy | Rule |
|--------|------|
| Profile access | User owns their profile |
| Design access | User owns their designs |
| Public designs | Readable by all authenticated users |

---

## Security Exclusions

The following are **never** included in this vault:

- Database connection strings
- Service role keys
- JWT signing secrets
- Production hostnames

---

*Continue to [[08-Industrial-Bridge]]*
