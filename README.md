# Flight Analytics — Architecture Médaillon sur Azure Databricks

Pipeline de données complet sur les vols domestiques USA (2003–2008) avec architecture Médaillon (Bronze → Silver → Gold) et visualisation Power BI.

---

## Architecture

```
CSV locaux (2003–2008)
        │
        ▼
Azure Data Lake Gen2 (/raw/)
        │
        ▼
┌───────────────────────────────────────┐
│           DATABRICKS (Serverless)     │
│                                       │
│  Bronze → Silver → Gold               │
│  (Delta Lake à chaque couche)         │
└───────────────────────┬───────────────┘
                        │
                        ▼
                    Power BI
```

### Couches Médaillon

| Couche | Contenu | Format |
|--------|---------|--------|
| **Bronze** | CSV bruts copiés sans modification | Delta Lake |
| **Silver** | Données nettoyées, typées, enrichies, partitionnées | Delta Lake |
| **Gold** | KPIs agrégés prêts pour Power BI | Delta Lake |

---

## Ressources Azure créées

| Ressource | Nom |
|-----------|-----|
| Resource Group | `rg-flight-analytics` |
| Storage Account (ADLS Gen2) | `stflightanalytics2026` |
| Container | `flightdata` |
| Databricks Workspace | `dbw-flight-analytics` |
| Key Vault | `kv-flight-analytics` |
| Secret Scope (Databricks) | `flight-scope` |

---

## Structure du projet

```
azure_projet/
├── .env                        # Variables locales (ne pas committer)
├── .gitignore
├── README.md
├── data/                       # Données source (CSV locaux)
│   ├── 2003.csv
│   ├── 2004.csv
│   ├── 2005.csv
│   ├── 2006.csv
│   ├── 2007.csv
│   ├── 2008.csv
│   ├── airports.csv
│   ├── carriers.csv
│   ├── plane-data.csv
│   └── variable-descriptions.csv
└── notebooks/
    ├── 00_config.py            # Configuration centrale + logger
    ├── 01_bronze.py            # Ingestion batch CSV → Delta
    ├── 02_silver.py            # Nettoyage, types, enrichissement
    └── 03_gold.py              # Agrégations KPIs pour Power BI
```

---

## Tables Gold disponibles pour Power BI

| Table | Description | Rows (approx.) |
|-------|-------------|---------------|
| `gold/carrier_performance` | Retards et ponctualité par compagnie / année | ~200 |
| `gold/airport_performance` | Retards par aéroport d'origine / année | ~3 000 |
| `gold/monthly_trends` | Tendances mensuelles (retards, annulations) | ~72 |
| `gold/delay_causes` | Causes de retard par compagnie (météo, NAS...) | ~200 |
| `gold/top_routes` | Top 200 routes les plus fréquentées | 200 |

---

## Prérequis

- Compte Azure actif avec `Azure subscription 1`
- Azure CLI installé (`az --version`)
- Python 3.8+ avec `python-dotenv` pour exécution locale
- Power BI Desktop pour la visualisation

---

## Installation et déploiement

### 1. Connexion Azure

```powershell
az login --tenant a9ec8e78-aba9-450f-8f22-399c376f0a6c
```

### 2. Vérifier les ressources

```powershell
az resource list --resource-group "rg-flight-analytics" --output table
```

### 3. Importer les notebooks dans Databricks

1. Ouvrir `https://adb-7405606941703443.3.azuredatabricks.net`
2. Workspace → Import → sélectionner les 4 fichiers `.py` du dossier `notebooks/`
3. Les 4 notebooks doivent être dans le **même dossier** (requis par `%run ./00_config`)

### 4. Choisir le compute

Dans chaque notebook, cliquez sur le menu **Connect** en haut à droite et choisissez votre compute :

| Option | Description |
|--------|-------------|
| **Existing cluster** | Cluster déjà démarré — recommandé si vous en avez un actif |
| **New cluster** | Crée un cluster dédié — à configurer (type de nœud, taille) |
| **Job cluster** | Cluster éphémère créé puis supprimé à la fin du job |

> Ne pas sélectionner **Serverless**.

### 5. Exécuter dans l'ordre

```
01_bronze  →  02_silver  →  03_gold
```

---

## Gestion des secrets

Les credentials sont stockés dans **Azure Key Vault** (`kv-flight-analytics`) et accessibles via le Secret Scope Databricks `flight-scope`.

| Clé Key Vault | Description |
|---------------|-------------|
| `storage-account` | Nom du Storage Account |
| `container` | Nom du container ADLS |
| `storage-key` | Clé d'accès au Storage Account |

Dans les notebooks, les secrets sont lus automatiquement :

```python
# Dans Databricks → lit depuis Key Vault
STORAGE_KEY = dbutils.secrets.get(scope="flight-scope", key="storage-key")

# En local → lit depuis .env
STORAGE_KEY = os.getenv("STORAGE_KEY")
```

> Ne jamais committer le fichier `.env` (protégé par `.gitignore`).

---

## Connexion Power BI

1. Ouvrir Power BI Desktop
2. **Get Data** → **Azure Databricks**
3. Server : `adb-7405606941703443.3.azuredatabricks.net`
4. Se connecter avec le compte Azure
5. Sélectionner les tables `gold/*`

---

## Dataset source

**Airline On-Time Performance** — Bureau of Transportation Statistics (BTS)

- **Période** : 2003 à 2008
- **Volume** : ~30 millions de vols
- **Colonnes** : 29 variables (retards, annulations, distances, compagnies...)
- **Référentiels** : airports, carriers, planes
