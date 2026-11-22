# Fertigation plant 3D — OEM layout references

GreenhouseOS maps each `FertigationTemplateId` to a **canonical physical skid** (`frontend/src/lib/fertigation/plantSkids/`). P&ID coordinates in the twin editor remain schematic; the R3F viewport uses **role-based poses** derived from public manufacturer documentation.

| Template | Zone model | Primary references |
|----------|------------|-------------------|
| `nft-dual` | Pump house / dual below-grade reservoirs | [Grow-Tek Commercial NFT](https://www.farmtek.com/wcsstore/EngineeringServices/allbizunits/techdocs/113516_17_18_19_20_21.pdf), [GPN isolation reservoir](https://gpnmag.com/article/hydroponic-system-design-adding-a-sanitation-isolation-reservoir/), [Priva NutriJet](https://support.priva.com/hc/en-us/article_attachments/5953681771794) |
| `nft-shared` | Single sump at greenhouse headwall | [Virginia SPES-463 NFT](https://www.pubs.ext.vt.edu/content/dam/pubs_ext_vt_edu/spes/spes-463/SPES-463.pdf), Grow-Tek tank pit |
| `dwc-recirc` | Large conditioning sump + raft circulation | SPES-463 reservoir-lowest-point pattern |
| `inline-drip` | Pressurized pipe gallery + zone manifold | [Netafim NetaJet 4G install manual](https://www.netafim.com/globalassets/digital-farming/netajet-4g/netajet-inst.-manual.pdf), [Netaflex 3G schematic](https://www.netafim.com/globalassets/digital-farming/fertigation/netaflex-3g/netaflex-inst-manual.pdf) |
| `substrate-drip` | Compact fertigation hut, once-through | [UF/IFAS CV263 rockwool](https://ask.ifas.ufl.edu/publication/CV263), [UF/IFAS CV195 drip head](https://ask.ifas.ufl.edu/publication/CV195/pdf) |

Stock tank visuals (A / B / acid) follow the **split Ca vs P concentrates** rule described in greenhouse fertigation design guides ([Greenhouse Management](https://www.greenhouse-management.com/greenhouse_management/fertigation_greenhouse_production/design_management_considerations.htm)).