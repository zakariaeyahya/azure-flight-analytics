# Databricks notebook source


# COMMAND ----------

# MAGIC %md
# MAGIC # Silver Layer — Nettoyage et enrichissement
# MAGIC - Cast des types corrects
# MAGIC - Suppression des lignes invalides
# MAGIC - Colonnes dérivées (is_delayed, delay_category)
# MAGIC - Jointures avec les tables de référence

# COMMAND ----------

# MAGIC %run ./00_config

# COMMAND ----------

from pyspark.sql import functions as F
from pyspark.sql.types import IntegerType, DoubleType

log = get_logger("silver")
log.info("Démarrage transformation Silver")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Lecture depuis Bronze

# COMMAND ----------

df_raw      = spark.read.format("delta").load(f"{BASE}/bronze/flights")
df_airports = spark.read.format("delta").load(f"{BASE}/bronze/airports")
df_carriers = spark.read.format("delta").load(f"{BASE}/bronze/carriers")

log.info("Bronze chargé | vols=%s | airports=%s | carriers=%s",
         f"{df_raw.count():,}", f"{df_airports.count():,}", f"{df_carriers.count():,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Cast des types et nettoyage

# COMMAND ----------

df_typed = (df_raw
    .withColumn("Year",              F.col("Year").cast(IntegerType()))
    .withColumn("Month",             F.col("Month").cast(IntegerType()))
    .withColumn("DayofMonth",        F.col("DayofMonth").cast(IntegerType()))
    .withColumn("DayOfWeek",         F.col("DayOfWeek").cast(IntegerType()))
    .withColumn("DepTime",           F.col("DepTime").cast(IntegerType()))
    .withColumn("CRSDepTime",        F.col("CRSDepTime").cast(IntegerType()))
    .withColumn("ArrTime",           F.col("ArrTime").cast(IntegerType()))
    .withColumn("CRSArrTime",        F.col("CRSArrTime").cast(IntegerType()))
    .withColumn("FlightNum",         F.col("FlightNum").cast(IntegerType()))
    .withColumn("ActualElapsedTime", F.col("ActualElapsedTime").cast(DoubleType()))
    .withColumn("AirTime",           F.col("AirTime").cast(DoubleType()))
    .withColumn("ArrDelay",          F.col("ArrDelay").cast(DoubleType()))
    .withColumn("DepDelay",          F.col("DepDelay").cast(DoubleType()))
    .withColumn("Distance",          F.col("Distance").cast(DoubleType()))
    .withColumn("TaxiIn",            F.col("TaxiIn").cast(DoubleType()))
    .withColumn("TaxiOut",           F.col("TaxiOut").cast(DoubleType()))
    .withColumn("Cancelled",         F.col("Cancelled").cast(IntegerType()))
    .withColumn("Diverted",          F.col("Diverted").cast(IntegerType()))
    .withColumn("CarrierDelay",      F.col("CarrierDelay").cast(DoubleType()))
    .withColumn("WeatherDelay",      F.col("WeatherDelay").cast(DoubleType()))
    .withColumn("NASDelay",          F.col("NASDelay").cast(DoubleType()))
    .withColumn("SecurityDelay",     F.col("SecurityDelay").cast(DoubleType()))
    .withColumn("LateAircraftDelay", F.col("LateAircraftDelay").cast(DoubleType()))
)

df_clean = df_typed.filter(F.col("Year").isNotNull() & F.col("Month").isNotNull())
dropped = df_raw.count() - df_clean.count()

log.info("Nettoyage types | lignes_valides=%s | lignes_supprimées=%s",
         f"{df_clean.count():,}", f"{dropped:,}")

if dropped > 0:
    log.warning("Lignes supprimées détectées | count=%d", dropped)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Colonnes dérivées

# COMMAND ----------

df_enriched = (df_clean
    .withColumn("is_delayed",
        F.when(F.col("ArrDelay") > 15, 1).otherwise(0))

    .withColumn("delay_category",
        F.when(F.col("Cancelled") == 1,     "cancelled")
         .when(F.col("ArrDelay") <= 0,      "on_time")
         .when(F.col("ArrDelay") <= 15,     "minor")
         .when(F.col("ArrDelay") <= 60,     "moderate")
         .otherwise(                         "severe"))

    .withColumn("main_delay_cause",
        F.when(F.col("CarrierDelay")      == F.greatest("CarrierDelay","WeatherDelay","NASDelay","LateAircraftDelay"), "carrier")
         .when(F.col("WeatherDelay")      == F.greatest("CarrierDelay","WeatherDelay","NASDelay","LateAircraftDelay"), "weather")
         .when(F.col("NASDelay")          == F.greatest("CarrierDelay","WeatherDelay","NASDelay","LateAircraftDelay"), "nas")
         .when(F.col("LateAircraftDelay") == F.greatest("CarrierDelay","WeatherDelay","NASDelay","LateAircraftDelay"), "late_aircraft")
         .otherwise(None))

    .withColumn("flight_date",
        F.to_date(F.concat_ws("-", F.col("Year"), F.col("Month"), F.col("DayofMonth"))))
)

log.info("Colonnes dérivées ajoutées | is_delayed, delay_category, main_delay_cause, flight_date")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Jointures avec les référentiels

# COMMAND ----------

airports_origin = df_airports.select(
    F.col("iata").alias("Origin"),
    F.col("airport").alias("origin_name"),
    F.col("city").alias("origin_city"),
    F.col("state").alias("origin_state")
)

airports_dest = df_airports.select(
    F.col("iata").alias("Dest"),
    F.col("airport").alias("dest_name"),
    F.col("city").alias("dest_city"),
    F.col("state").alias("dest_state")
)

carriers_clean = df_carriers.select(
    F.col("Code").alias("UniqueCarrier"),
    F.col("Description").alias("carrier_name")
)

df_silver = (df_enriched
    .join(airports_origin, on="Origin", how="left")
    .join(airports_dest,   on="Dest",   how="left")
    .join(carriers_clean,  on="UniqueCarrier", how="left")
)

log.info("Jointures OK | silver lignes=%s | colonnes=%d",
         f"{df_silver.count():,}", len(df_silver.columns))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Écriture Silver

# COMMAND ----------

(df_silver.write
    .format("delta")
    .mode("overwrite")
    .partitionBy("Year", "Month")
    .save(f"{BASE}/silver/flights"))

log.info("Écriture Delta OK | path=silver/flights | partition=Year/Month")

# COMMAND ----------

dist = spark.read.format("delta").load(f"{BASE}/silver/flights") \
    .groupBy("delay_category").count().orderBy("count", ascending=False)

log.info("Distribution delay_category :")
for row in dist.collect():
    log.info("  %-15s → %s", row["delay_category"], f"{row['count']:,}")

log.info("Silver terminé avec succès")