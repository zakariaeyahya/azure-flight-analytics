# Flight Analytics — Architecture Médaillon sur Azure Databricks

Pipeline de données complet sur les **vols domestiques USA (2003–2008)** analysant ~30 millions de vols via une architecture Médaillon (Bronze → Silver → Gold) avec un dashboard interactif React.

---

## Architecture globale

```
Fichiers CSV source (2003–2008)
          │
          ▼
  Azure Data Lake Gen2
       /raw/
          │
          ▼
┌─────────────────────────────────┐
│         DATABRICKS              │
│                                 │
│  /bronze/  — données brutes     │
│      ↓                          │
│  /silver/  — données nettoyées  │
│      ↓                          │
│  /gold/    — KPIs agrégés       │
│      ↓                          │
│  /gold_csv/ — export CSV web    │
└──────────────┬──────────────────┘
               │ SAS Token (lecture seule)
               ▼
     Dashboard React + MUI
   (lit directement depuis ADLS)
```

### Qu'est-ce que l'architecture Médaillon ?

| Couche | Rôle | Format |
|--------|------|--------|
| **Bronze** | Copie exacte des CSV source, sans modification | Delta Lake |
| **Silver** | Données nettoyées, typées, enrichies avec noms d'aéroports et compagnies | Delta Lake |
| **Gold** | Agrégations métier prêtes à visualiser | Delta Lake |
| **gold_csv/** | Export CSV pour lecture directe par le dashboard web | CSV |

---

## Ressources Azure utilisées

| Ressource | Rôle |
|-----------|------|
| **Resource Group** | Conteneur logique pour toutes les ressources |
| **Storage Account (ADLS Gen2)** | Stockage des données (Data Lake) |
| **Databricks Workspace** | Traitement Spark des données |
| **Azure Key Vault** | Stockage sécurisé des secrets |
| **Secret Scope Databricks** | Lien entre Databricks et Key Vault |

---

## Tables Gold produites

| Table | Description | Lignes |
|-------|-------------|-------:|
| `carrier_performance` | Ponctualité par compagnie / année | 117 |
| `airport_performance` | Retards par aéroport d'origine / année | 1 392 |
| `monthly_trends` | Tendances mensuelles (retards, annulations) | 64 |
| `delay_causes` | Causes de retard par compagnie | 117 |
| `top_routes` | Top 200 routes les plus fréquentées | 200 |

---

## Structure du projet

```
azure_projet/
├── .env                          # Secrets locaux — NE PAS COMMITTER
├── .gitignore
├── README.md
├── notebooks/
│   ├── 00_config.py              # Configuration centrale + logger
│   ├── 01_bronze.py              # Ingestion CSV → Delta Lake
│   ├── 02_silver.py              # Nettoyage et enrichissement
│   └── 03_gold.py                # Agrégations KPIs + export CSV
└── dashboard/
    ├── .env                      # URL ADLS + SAS token — NE PAS COMMITTER
    ├── .gitignore
    ├── src/
    │   ├── config/datasource.ts  # URL builder ADLS
    │   ├── types/index.ts        # Interfaces TypeScript
    │   ├── hooks/useCSV.ts       # Lecture CSV via Papa Parse
    │   ├── context/FilterContext.tsx
    │   ├── components/           # Layout, KpiCard, ChartCard
    │   └── pages/                # 5 pages du dashboard
    └── package.json
```

---

## Prérequis

- Compte **Microsoft Azure** actif
- **Azure CLI** installé — [télécharger ici](https://learn.microsoft.com/fr-fr/cli/azure/install-azure-cli)
- **Node.js 18+** et npm — [télécharger ici](https://nodejs.org)
- **Python 3.8+** (optionnel, pour exécution locale)

---

## Partie 1 — Infrastructure Azure

### Étape 1 — Se connecter à Azure

```powershell
az login --tenant <VOTRE_TENANT_ID>
```

> Remplacez `<VOTRE_TENANT_ID>` par votre identifiant de tenant Azure (visible dans Azure Portal → Azure Active Directory).

### Étape 2 — Créer le Resource Group

```powershell
az group create --name "rg-flight-analytics" --location "westeurope" --output table
```

### Étape 3 — Créer le Storage Account (ADLS Gen2)

```powershell
az storage account create `
  --name "<NOM_STORAGE>" `
  --resource-group "rg-flight-analytics" `
  --location "westeurope" `
  --sku "Standard_LRS" `
  --kind "StorageV2" `
  --hns true `
  --output table
```

> `--hns true` active le **Hierarchical Namespace** — c'est ce qui fait du Storage Account un Azure Data Lake Gen2.

### Étape 4 — Créer le container et les dossiers

```powershell
az storage fs create --name "flightdata" --account-name "<NOM_STORAGE>" --auth-mode login

az storage fs directory create --file-system "flightdata" --name "raw"    --account-name "<NOM_STORAGE>" --auth-mode login
az storage fs directory create --file-system "flightdata" --name "bronze" --account-name "<NOM_STORAGE>" --auth-mode login
az storage fs directory create --file-system "flightdata" --name "silver" --account-name "<NOM_STORAGE>" --auth-mode login
az storage fs directory create --file-system "flightdata" --name "gold"   --account-name "<NOM_STORAGE>" --auth-mode login
```

### Étape 5 — Uploader les CSV source vers /raw/

```powershell
$files = @("2003.csv","2004.csv","2005.csv","2006.csv","2007.csv","2008.csv","airports.csv","carriers.csv","plane-data.csv")
foreach ($f in $files) {
    az storage fs file upload `
      --source "<CHEMIN_LOCAL>\data\$f" `
      --path "raw/$f" `
      --file-system "flightdata" `
      --account-name "<NOM_STORAGE>" `
      --auth-mode login
}
```

### Étape 6 — Créer le workspace Databricks

```powershell
az extension add --name databricks

az databricks workspace create `
  --name "dbw-flight-analytics" `
  --resource-group "rg-flight-analytics" `
  --location "westeurope" `
  --sku "premium" `
  --output table
```

> Le SKU **premium** est requis pour Unity Catalog et les Secret Scopes.

---

## Partie 2 — Gestion des secrets avec Key Vault

### Pourquoi Key Vault ?

Ne jamais mettre de clés ou mots de passe directement dans le code. Key Vault stocke les secrets de manière chiffrée et les expose à Databricks via un Secret Scope.

### Étape 7 — Créer le Key Vault

```powershell
az keyvault create `
  --name "<NOM_KEYVAULT>" `
  --resource-group "rg-flight-analytics" `
  --location "westeurope"
```

### Étape 8 — Accorder vos permissions sur le Key Vault

```powershell
$kvScope = az keyvault show --name "<NOM_KEYVAULT>" --resource-group "rg-flight-analytics" --query id -o tsv
$userObjectId = az ad signed-in-user show --query id -o tsv

az role assignment create `
  --assignee $userObjectId `
  --role "Key Vault Secrets Officer" `
  --scope $kvScope
```

### Étape 9 — Stocker les secrets

```powershell
# Récupérer la clé du Storage Account
$storageKey = az storage account keys list `
  --account-name "<NOM_STORAGE>" `
  --resource-group "rg-flight-analytics" `
  --query "[0].value" -o tsv

az keyvault secret set --vault-name "<NOM_KEYVAULT>" --name "storage-account" --value "<NOM_STORAGE>"
az keyvault secret set --vault-name "<NOM_KEYVAULT>" --name "container"        --value "flightdata"
az keyvault secret set --vault-name "<NOM_KEYVAULT>" --name "storage-key"      --value $storageKey
```

### Étape 10 — Lier Key Vault à Databricks

Ouvrez dans votre navigateur :
```
https://<VOTRE_WORKSPACE_DATABRICKS>.azuredatabricks.net/#secrets/createScope
```

Remplissez :
- **Scope Name** : `flight-scope`
- **DNS Name** : `https://<NOM_KEYVAULT>.vault.azure.net/`
- **Resource ID** : la valeur de `$kvScope` affichée à l'étape 8

Avant cela, accordez l'accès à Databricks sur le Key Vault :

```powershell
az role assignment create `
  --assignee "2ff814a6-3304-4ab8-85cb-cd0e6f879c1d" `
  --role "Key Vault Secrets User" `
  --scope $kvScope
```

> `2ff814a6-3304-4ab8-85cb-cd0e6f879c1d` est l'App ID officiel d'Azure Databricks — identique pour tous les workspaces.

---

## Partie 3 — Pipeline Databricks

### Étape 11 — Importer les notebooks

1. Ouvrir votre workspace Databricks
2. **Workspace** → clic droit → **Import**
3. Importer les 4 fichiers `.py` du dossier `notebooks/` dans le **même dossier**

> Les notebooks utilisent `%run ./00_config` — ils doivent tous être au même endroit.

### Étape 12 — Choisir le compute

Dans chaque notebook, cliquez sur **Connect** :

| Option | Description |
|--------|-------------|
| **Existing cluster** | Cluster déjà actif — recommandé |
| **New cluster** | Runtime 14.3 LTS, Standard_DS3_v2 |

### Étape 13 — Exécuter les notebooks dans l'ordre

```
01_bronze  →  02_silver  →  03_gold
```

À la fin de `03_gold`, les tables sont automatiquement exportées en CSV dans `gold_csv/` pour le dashboard.

---

## Partie 4 — Dashboard React

### Étape 14 — Activer CORS sur le Storage Account

```powershell
az storage cors add `
  --account-name "<NOM_STORAGE>" `
  --account-key "<VOTRE_CLE_STORAGE>" `
  --services b `
  --methods GET OPTIONS `
  --origins "*" `
  --allowed-headers "*" `
  --exposed-headers "*" `
  --max-age 3600
```

> CORS permet au navigateur d'accepter les réponses venant du domaine Azure Storage.

### Étape 15 — Générer un SAS token (lecture seule)

```powershell
$expiry = (Get-Date).AddYears(1).ToString("yyyy-MM-ddTHH:mmZ")

az storage container generate-sas `
  --account-name "<NOM_STORAGE>" `
  --account-key "<VOTRE_CLE_STORAGE>" `
  --name "flightdata" `
  --permissions "rl" `
  --expiry $expiry `
  --output tsv
```

> Un SAS token est une URL signée avec permissions limitées (ici : lecture seule, durée 1 an). Il ne donne pas accès à tout le compte.

### Étape 16 — Configurer le fichier `.env` du dashboard

Créer le fichier `dashboard/.env` :

```env
VITE_ADLS_BASE_URL=https://<NOM_STORAGE>.blob.core.windows.net/flightdata/gold_csv
VITE_ADLS_SAS_TOKEN=<COLLER_LE_SAS_TOKEN_ICI>
```

> Ce fichier est dans `.gitignore` — il ne sera jamais commité.

### Étape 17 — Lancer le dashboard

```powershell
cd dashboard
npm install
npm run dev
```

Ouvrir `http://localhost:5173`

### Pages du dashboard

| Page | Route | Données |
|------|-------|---------|
| Vue générale | `/` | `monthly_trends` — saisonnalité et tendances |
| Compagnies | `/airlines` | `carrier_performance` — ponctualité par compagnie |
| Aéroports | `/airports` | `airport_performance` — retards par aéroport |
| Causes retards | `/causes` | `delay_causes` — météo, NAS, compagnie... |
| Top Routes | `/routes` | `top_routes` — 200 routes principales |

---

## Nettoyage — Supprimer les fichiers locaux

Une fois le pipeline exécuté et le dashboard fonctionnel, les données locales ne sont plus nécessaires (elles vivent dans Azure) :

```powershell
Remove-Item -Recurse -Force "<CHEMIN_LOCAL>\data"
Remove-Item -Recurse -Force "<CHEMIN_LOCAL>\gold_csv"    -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "<CHEMIN_LOCAL>\gold_export" -ErrorAction SilentlyContinue
```

---

## Dataset source

**Airline On-Time Performance** — Bureau of Transportation Statistics (BTS)

- **Période** : 2003 à 2008
- **Volume** : ~30 millions de vols
- **Colonnes** : 29 variables (retards, annulations, distances, compagnies...)
- **Référentiels** : airports, carriers, planes
