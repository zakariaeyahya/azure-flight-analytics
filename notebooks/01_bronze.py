# Databricks notebook source

# COMMAND ----------
# MAGIC %md
# MAGIC # Bronze Layer — Ingestion brute des CSV
# MAGIC Lecture des fichiers CSV depuis /raw/ et écriture en Delta Lake sans transformation.
# MAGIC Les données sont conservées telles quelles (raw = source de vérité).

# COMMAND ----------

# MAGIC %run ./00_config

# COMMAND ----------

log = get_logger("bronze")
log.info("Démarrage ingestion Bronze | storage=%s | container=%s", STORAGE_ACCOUNT, CONTAINER)

# COMMAND ----------
# MAGIC %md
# MAGIC ## 1. Ingestion des vols (2003–2008)

# COMMAND ----------

df_flights = (spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv(f"{BASE}/raw/20*.csv"))

log.info("Vols lus depuis /raw/ | lignes=%s | colonnes=%d", f"{df_flights.count():,}", len(df_flights.columns))

# COMMAND ----------

(df_flights.write
    .format("delta")
    .mode("overwrite")
    .save(f"{BASE}/bronze/flights"))

log.info("Écriture Delta OK | path=bronze/flights")

# COMMAND ----------
# MAGIC %md
# MAGIC ## 2. Tables de référence

# COMMAND ----------

ref_tables = {
    "airports" : "airports.csv",
    "carriers" : "carriers.csv",
    "planes"   : "plane-data.csv",
}

for table_name, filename in ref_tables.items():
    df = (spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv(f"{BASE}/raw/{filename}"))

    (df.write
        .format("delta")
        .mode("overwrite")
        .save(f"{BASE}/bronze/{table_name}"))

    log.info("Écriture Delta OK | path=bronze/%-10s | lignes=%s", table_name, f"{df.count():,}")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Vérification finale

# COMMAND ----------

for path in ["flights", "airports", "carriers", "planes"]:
    count = spark.read.format("delta").load(f"{BASE}/bronze/{path}").count()
    log.info("Vérification | bronze/%-12s → %s lignes", path, f"{count:,}")

log.info("Bronze terminé avec succès")
