# Plan

Add a repository-local Python cleanup helper and isolated Docker doubles. Invoke only after the existing readiness gate. Scope image/container deletion by exact repository and service prefixes; never force image removal or prune volumes. Prune only unused builder entries older than 24 hours, retaining 1 GB. Keep live .env and host secrets. Transfer helpers with immutable CI artifacts where source is not copied. No API or dependency changes.
