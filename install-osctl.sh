#!/usr/bin/env bash
set -euo pipefail

REPO="jboix/osctl"

usage() {
  echo ""
  echo "Installs the osctl binary from GitHub releases."
  echo ""
  echo "The binary is installed in a versioned folder next to this script."
  echo "The 'current' symlink is updated to point to the installed version."
  echo ""
  echo "Options:"
  echo "  -v <version>   The version to install (e.g., 1.2.3). Defaults to the latest release."
  echo ""
  echo "Example:"
  echo "  $0 -v 1.2.3"
  echo ""
  exit 1
}

VERSION=""
while getopts "v:h" opt; do
  case ${opt} in
    v ) VERSION=$OPTARG ;;
    * ) usage ;;
  esac
done

# Resolve the latest version from the GitHub release redirect when -v is not given.
if [ -z "$VERSION" ]; then
  LATEST_URL=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest")
  VERSION="${LATEST_URL##*/v}"
  if [ -z "$VERSION" ] || [ "$VERSION" = "$LATEST_URL" ]; then
    echo "Could not resolve the latest version. Pass one explicitly with -v."
    exit 1
  fi
  echo "Latest version: ${VERSION}"
fi

# Map the platform to a release asset name.
case "$(uname -s)" in
  Linux  ) OS="linux" ;;
  Darwin ) OS="darwin" ;;
  *      ) echo "Unsupported OS: $(uname -s). On Windows, use: npm install -g osctl"; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64          ) ARCH="x64" ;;
  aarch64 | arm64 ) ARCH="arm64" ;;
  *               ) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

ASSET="osctl-${OS}-${ARCH}"
ARCHIVE="${ASSET}.tar.gz"
BASE_URL="https://github.com/${REPO}/releases/download/v${VERSION}"

INSTALL_BASE="$(cd "$(dirname "$0")" && pwd)"
VERSION_DIR="${INSTALL_BASE}/${VERSION}"
CURRENT_SYMLINK="${INSTALL_BASE}/current"

# Prints the sha256 of a file. Prints nothing when no hashing tool is installed.
sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{ print $1 }'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{ print $1 }'
  fi
}

# Checks the downloaded archive against the published SHA256SUMS.
verify_archive() {
  local dir="$1"
  local expected actual
  if ! curl -fsSL -o "${dir}/SHA256SUMS" "${BASE_URL}/SHA256SUMS"; then
    echo "No SHA256SUMS published for v${VERSION}. Skipping the checksum check."
    return 0
  fi
  actual="$(sha256_of "${dir}/${ARCHIVE}")"
  if [ -z "$actual" ]; then
    echo "Neither sha256sum nor shasum is installed. Skipping the checksum check."
    return 0
  fi
  expected="$(awk -v name="$ARCHIVE" '$2 == name { print $1 }' "${dir}/SHA256SUMS")"
  if [ -z "$expected" ]; then
    echo "SHA256SUMS has no entry for ${ARCHIVE}."
    exit 1
  fi
  if [ "$expected" != "$actual" ]; then
    echo "Checksum mismatch for ${ARCHIVE}."
    echo "  expected ${expected}"
    echo "  actual   ${actual}"
    exit 1
  fi
  echo "Checksum verified."
}

echo "Installing osctl ${VERSION} (${OS}-${ARCH}) into ${VERSION_DIR}"

if [ -f "${VERSION_DIR}/osctl" ]; then
  echo "Version ${VERSION} is already installed."
else
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT
  echo "Downloading ${BASE_URL}/${ARCHIVE}"
  if curl -fSL -o "${TMP_DIR}/${ARCHIVE}" "${BASE_URL}/${ARCHIVE}"; then
    verify_archive "$TMP_DIR"
    tar -xzf "${TMP_DIR}/${ARCHIVE}" -C "$TMP_DIR"
  elif curl -fSL -o "${TMP_DIR}/osctl" "${BASE_URL}/${ASSET}"; then
    # Releases before 1.0.0 shipped the bare binary instead of an archive.
    echo "v${VERSION} ships no archive. Fell back to the bare binary."
  else
    echo "Download failed. Does v${VERSION} exist and does it ship ${ARCHIVE}?"
    exit 1
  fi
  chmod +x "${TMP_DIR}/osctl"
  mkdir -p "$VERSION_DIR"
  mv "${TMP_DIR}/osctl" "${VERSION_DIR}/osctl"
  rm -rf "$TMP_DIR"
  trap - EXIT
fi

ln -sfn "$VERSION_DIR" "$CURRENT_SYMLINK"
echo "Symlink updated: ${CURRENT_SYMLINK} -> ${VERSION_DIR}"
echo "Install complete. osctl ${VERSION} is now active."
echo ""
echo "Add it to your PATH if you have not already:"
echo "  export PATH=\"${INSTALL_BASE}/current:\$PATH\""
