# List of the libs you want to process
libs=(
  api
  auth
  common
  database
  real-time
  storage
  sdk
  web-auth
  react-native-auth
)

for lib in "${libs[@]}"; do
  pkg_path="./libs/$lib/package.json"
  if [ -f "$pkg_path" ]; then
    echo "Processing $pkg_path"
    jq '(.dependencies // {}) |= with_entries(if .key | startswith("@forgebase-ts/") then .value = env.NEW_VERSION else . end) |
        (.peerDependencies // {}) |= with_entries(if .key | startswith("@forgebase-ts/") then .value = env.NEW_VERSION else . end)' "$pkg_path" > "$pkg_path.tmp" && mv "$pkg_path.tmp" "$pkg_path"
  else
    echo "Warning: $pkg_path does not exist"
  fi
done
