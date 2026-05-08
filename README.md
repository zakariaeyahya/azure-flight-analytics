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
│           DATABRICKS                  │
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
| **Silver** | Données nettoyées, typées, enrichies, partitionnées par Year/Month | Delta Lake |
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

## Tables Gold — Résultats réels

> Pipeline exécuté le 2026-05-08 avec succès.

| Table | Description | Lignes |
|-------|-------------|-------:|
| `gold/carrier_performance` | Ponctualité par compagnie / année | 117 |
| `gold/airport_performance` | Retards par aéroport d'origine / année | 1 392 |
| `gold/monthly_trends` | Tendances mensuelles (retards, annulations) | 64 |
| `gold/delay_causes` | Causes de retard par compagnie (météo, NAS...) | 117 |
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

Dans chaque notebook, cliquez sur **Connect** en haut à droite :

| Option | Description |
|--------|-------------|
| **Existing cluster** | Cluster déjà démarré — recommandé si vous en avez un actif |
| **New cluster** | Crée un cluster dédié — Runtime 14.3 LTS, Standard_DS3_v2 |
| **Job cluster** | Cluster éphémère créé puis supprimé à la fin du job |

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
2. **Obtenir des données** → **Azure Databricks**
3. Server Hostname : `adb-7405606941703443.3.azuredatabricks.net`
4. HTTP Path : `Compute → votre cluster → Advanced Options → JDBC/ODBC → HTTP Path`
5. Authentification : **Azure Active Directory**
6. Sélectionner les 5 tables `gold/*`

### Visuels suggérés

| Visuel | Table | Axes |
|--------|-------|------|
| Barres — ponctualité par compagnie | `carrier_performance` | X: carrier_name / Y: delay_rate_pct |
| Carte USA — retards par état | `airport_performance` | Location: origin_state / Valeur: avg_arr_delay_min |
| Courbe — évolution mensuelle | `monthly_trends` | X: Month / Y: avg_arr_delay_min / Légende: Year |
| Barres empilées — causes de retard | `delay_causes` | X: carrier_name / Y: avg_carrier + avg_weather + avg_nas |
| Table — top routes | `top_routes` | route, total_flights, delay_rate_pct |

---

## Dataset source

**Airline On-Time Performance** — Bureau of Transportation Statistics (BTS)

- **Période** : 2003 à 2008
- **Volume** : ~30 millions de vols
- **Colonnes** : 29 variables (retards, annulations, distances, compagnies...)
- **Référentiels** : airports, carriers, planes
