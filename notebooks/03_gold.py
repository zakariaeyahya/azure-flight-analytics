# Databricks notebook source


# COMMAND ----------

# MAGIC %md
# MAGIC # Gold Layer — KPIs agrégés pour Power BI
# MAGIC Tables pré-agrégées optimisées pour la visualisation.
# MAGIC Chaque table Gold répond à une question business précise.

# COMMAND ----------

# MAGIC %run ./00_config

# COMMAND ----------

from pyspark.sql import functions as F

log = get_logger("gold")
log.info("Démarrage agrégations Gold")

df_silver = spark.read.format("delta").load(f"{BASE}/silver/flights")
log.info("Silver chargé | lignes=%s", f"{df_silver.count():,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Gold 1 — Retards par compagnie aérienne (par année)
# MAGIC > **Question business** : Quelle compagnie est la plus ponctuelle ?

# COMMAND ----------

gold_carrier = (df_silver
    .filter(F.col("Cancelled") == 0)
    .groupBy("Year", "UniqueCarrier", "carrier_name")
    .agg(
        F.count("*")                                              .alias("total_flights"),
        F.sum("is_delayed")                                       .alias("delayed_flights"),
        F.round(F.avg("ArrDelay"), 2)                            .alias("avg_arr_delay_min"),
        F.round(F.avg("DepDelay"), 2)                            .alias("avg_dep_delay_min"),
        F.round(F.sum("is_delayed") / F.count("*") * 100, 2)    .alias("delay_rate_pct"),
        F.round(F.avg("Distance"), 0)                            .alias("avg_distance_miles"),
    )
    .orderBy("Year", "delay_rate_pct")
)

gold_carrier.write.format("delta").mode("overwrite").save(f"{BASE}/gold/carrier_performance")
log.info("Écrit | gold/carrier_performance | lignes=%s", f"{gold_carrier.count():,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Gold 2 — Retards par aéroport d'origine (par année)
# MAGIC > **Question business** : Quels aéroports génèrent le plus de retards ?

# COMMAND ----------

gold_airport = (df_silver
    .filter(F.col("Cancelled") == 0)
    .groupBy("Year", "Origin", "origin_name", "origin_city", "origin_state")
    .agg(
        F.count("*")                                              .alias("total_flights"),
        F.sum("is_delayed")                                       .alias("delayed_flights"),
        F.round(F.avg("ArrDelay"), 2)                            .alias("avg_arr_delay_min"),
        F.round(F.avg("DepDelay"), 2)                            .alias("avg_dep_delay_min"),
        F.round(F.sum("is_delayed") / F.count("*") * 100, 2)    .alias("delay_rate_pct"),
        F.round(F.avg("TaxiOut"), 2)                             .alias("avg_taxi_out_min"),
    )
    .filter(F.col("total_flights") > 1000)
    .orderBy("Year", F.col("delay_rate_pct").desc())
)

gold_airport.write.format("delta").mode("overwrite").save(f"{BASE}/gold/airport_performance")
log.info("Écrit | gold/airport_performance | lignes=%s", f"{gold_airport.count():,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Gold 3 — Tendance mensuelle des retards (par année/mois)
# MAGIC > **Question business** : Y a-t-il des saisons avec plus de retards ?

# COMMAND ----------

gold_monthly = (df_silver
    .groupBy("Year", "Month")
    .agg(
        F.count("*")                                                                      .alias("total_flights"),
        F.sum("Cancelled")                                                                .alias("cancelled_flights"),
        F.round(F.sum("Cancelled") / F.count("*") * 100, 2)                             .alias("cancellation_rate_pct"),
        F.round(F.avg(F.when(F.col("Cancelled") == 0, F.col("ArrDelay"))), 2)           .alias("avg_arr_delay_min"),
        F.sum(F.when(F.col("delay_category") == "severe",   1).otherwise(0))             .alias("severe_delays"),
        F.sum(F.when(F.col("delay_category") == "moderate", 1).otherwise(0))             .alias("moderate_delays"),
        F.sum(F.when(F.col("delay_category") == "minor",    1).otherwise(0))             .alias("minor_delays"),
        F.sum(F.when(F.col("delay_category") == "on_time",  1).otherwise(0))             .alias("on_time_flights"),
    )
    .orderBy("Year", "Month")
)

gold_monthly.write.format("delta").mode("overwrite").save(f"{BASE}/gold/monthly_trends")
log.info("Écrit | gold/monthly_trends | lignes=%s", f"{gold_monthly.count():,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Gold 4 — Causes de retard par compagnie
# MAGIC > **Question business** : Les retards sont-ils dus à la météo, au transporteur, ou au NAS ?

# COMMAND ----------

gold_causes = (df_silver
    .filter((F.col("Cancelled") == 0) & (F.col("ArrDelay") > 15))
    .groupBy("Year", "UniqueCarrier", "carrier_name")
    .agg(
        F.count("*")                           .alias("delayed_flights"),
        F.round(F.avg("CarrierDelay"), 2)      .alias("avg_carrier_delay"),
        F.round(F.avg("WeatherDelay"), 2)      .alias("avg_weather_delay"),
        F.round(F.avg("NASDelay"), 2)          .alias("avg_nas_delay"),
        F.round(F.avg("LateAircraftDelay"), 2) .alias("avg_late_aircraft_delay"),
        F.round(F.avg("SecurityDelay"), 2)     .alias("avg_security_delay"),
    )
    .orderBy("Year", "UniqueCarrier")
)

gold_causes.write.format("delta").mode("overwrite").save(f"{BASE}/gold/delay_causes")
log.info("Écrit | gold/delay_causes | lignes=%s", f"{gold_causes.count():,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Gold 5 — Routes les plus fréquentées
# MAGIC > **Question business** : Quelles routes ont le plus de trafic et de retards ?

# COMMAND ----------

gold_routes = (df_silver
    .filter(F.col("Cancelled") == 0)
    .withColumn("route", F.concat_ws("→", F.col("Origin"), F.col("Dest")))
    .groupBy("route", "Origin", "Dest", "origin_city", "dest_city")
    .agg(
        F.count("*")                                              .alias("total_flights"),
        F.round(F.avg("ArrDelay"), 2)                            .alias("avg_arr_delay_min"),
        F.round(F.avg("Distance"), 0)                            .alias("distance_miles"),
        F.round(F.sum("is_delayed") / F.count("*") * 100, 2)    .alias("delay_rate_pct"),
    )
    .filter(F.col("total_flights") > 500)
    .orderBy(F.col("total_flights").desc())
    .limit(200)
)

gold_routes.write.format("delta").mode("overwrite").save(f"{BASE}/gold/top_routes")
log.info("Écrit | gold/top_routes | lignes=%s", f"{gold_routes.count():,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Résumé final

# COMMAND ----------

gold_tables = [
    "carrier_performance",
    "airport_performance",
    "monthly_trends",
    "delay_causes",
    "top_routes",
]

log.info("=" * 55)
log.info("GOLD LAYER — Résumé des tables créées")
log.info("=" * 55)
for t in gold_tables:
    count = spark.read.format("delta").load(f"{BASE}/gold/{t}").count()
    log.info("  gold/%-25s → %s lignes", t, f"{count:,}")
log.info("=" * 55)
log.info("Gold terminé avec succès — tables prêtes pour Power BI")