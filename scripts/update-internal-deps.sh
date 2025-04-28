#!/bin/bash

NEW_VERSION="${NEW_VERSION:-0.0.0}"  # fallback if NEW_VERSION not set

echo "Updating internal forgebase-ts dependencies to version $NEW_VERSION..."

# Find all package.json files inside ./libs
find ./libs -name "package.json" -type f | while read pkg; do
  echo "Processing $pkg"

  # Use jq to update dependencies and peerDependencies
  tmpfile=$(mktemp)

  jq --arg newVersion "$NEW_VERSION" '
    .dependencies |= with_entries(
      if (.key | startswith("@forgebase-ts/")) then
        .value = $newVersion
      else
        .
      end
    ) |
    .peerDependencies |= with_entries(
      if (.key | startswith("@forgebase-ts/")) then
        .value = $newVersion
      else
        .
      end
    )
  ' "$pkg" > "$tmpfile" && mv "$tmpfile" "$pkg"

done
