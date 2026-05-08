# Databricks notebook source

# COMMAND ----------
# MAGIC %md
# MAGIC # Configuration centrale — Ne pas modifier les autres notebooks
# MAGIC Ce notebook est appelé via `%run ./00_config` depuis Bronze/Silver/Gold.

# COMMAND ----------

import logging

try:
    # Dans Databricks : dbutils est injecté automatiquement au runtime
    STORAGE_ACCOUNT = dbutils.secrets.get(scope="flight-scope", key="storage-account")  # noqa: F821
    CONTAINER       = dbutils.secrets.get(scope="flight-scope", key="container")         # noqa: F821
    STORAGE_KEY     = dbutils.secrets.get(scope="flight-scope", key="storage-key")       # noqa: F821
except NameError:
    # En local : chargement depuis .env
    import os
    from dotenv import load_dotenv
    load_dotenv()
    STORAGE_ACCOUNT = os.getenv("STORAGE_ACCOUNT")
    CONTAINER       = os.getenv("CONTAINER")
    STORAGE_KEY     = os.getenv("STORAGE_KEY")

BASE = f"abfss://{CONTAINER}@{STORAGE_ACCOUNT}.dfs.core.windows.net"

spark.conf.set(
    f"fs.azure.account.key.{STORAGE_ACCOUNT}.dfs.core.windows.net",
    STORAGE_KEY
)

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%H:%M:%S"
        ))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger
