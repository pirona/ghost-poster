#!/usr/bin/env python3
"""
Patch android/ after expo prebuild:
  - Ajoute la release signingConfig dans build.gradle
  - Remplace le signingConfig debug par release pour le buildType release
  - Nomme l'APK ghostposter-<version>.apk
  - Injecte les props de signature dans gradle.properties
  - Corrige les JVM args pour JDK 21

Usage:
  python3 scripts/configure-android.py

Variables d'environnement (optionnelles en local si keystore déjà en place) :
  RELEASE_KEYSTORE_PATH    chemin vers le fichier .jks/.keystore à copier
  RELEASE_KEY_ALIAS        alias de la clé  (défaut : valeur locale)
  RELEASE_STORE_PASSWORD   mot de passe du keystore
  RELEASE_KEY_PASSWORD     mot de passe de la clé
"""
import json, os, re, shutil, sys
from pathlib import Path

ROOT          = Path(__file__).parent.parent
BUILD_GRADLE  = ROOT / "android/app/build.gradle"
GRADLE_PROPS  = ROOT / "android/gradle.properties"
KEYSTORE_DST  = ROOT / "android/app/keystore/release.keystore"

if not BUILD_GRADLE.exists():
    sys.exit("android/app/build.gradle introuvable — lance expo prebuild d'abord.")

# Version depuis app.json
with open(ROOT / "app.json") as f:
    version = json.load(f)["expo"]["version"]

key_alias  = os.environ.get("RELEASE_KEY_ALIAS",        "af2ec445f739391a5c284c6c153b8018")
store_pw   = os.environ.get("RELEASE_STORE_PASSWORD",   "")
key_pw     = os.environ.get("RELEASE_KEY_PASSWORD",     "")

# Cherche la keystore : RELEASE_KEYSTORE_PATH > .secrets/ > android/app/keystore/
ks_src = os.environ.get("RELEASE_KEYSTORE_PATH", "")
if not ks_src:
    fallback = ROOT / ".secrets/release.keystore"
    if fallback.exists():
        ks_src = str(fallback)

# 1. Keystore
if ks_src and Path(ks_src).resolve() != KEYSTORE_DST.resolve():
    KEYSTORE_DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ks_src, KEYSTORE_DST)
    print(f"  keystore copié depuis {ks_src}")
elif not KEYSTORE_DST.exists():
    sys.exit(f"Keystore introuvable.\n"
             "Options : RELEASE_KEYSTORE_PATH=<chemin> ou place le fichier dans .secrets/release.keystore")

# 2. gradle.properties
props = GRADLE_PROPS.read_text()

# Corrige JVM args (remplace la ligne existante)
props = re.sub(
    r"org\.gradle\.jvmargs=.*",
    "org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m "
    "--add-opens=java.base/java.io=ALL-UNNAMED "
    "--add-opens=java.base/java.lang=ALL-UNNAMED",
    props,
)

# Injecte signing seulement si absent
if "RELEASE_STORE_FILE" not in props:
    props += f"""
# Release signing
RELEASE_STORE_FILE=keystore/release.keystore
RELEASE_KEY_ALIAS={key_alias}
RELEASE_STORE_PASSWORD={store_pw}
RELEASE_KEY_PASSWORD={key_pw}
"""
GRADLE_PROPS.write_text(props)
print("  gradle.properties patché")

# 3. build.gradle
content = BUILD_GRADLE.read_text()

# 3a. Ajoute signingConfigs.release (après le bloc debug)
if "storeFile file(RELEASE_STORE_FILE)" not in content:
    content = content.replace(
        "            keyPassword 'android'\n        }\n    }\n    buildTypes {",
        "            keyPassword 'android'\n        }\n"
        "        release {\n"
        "            storeFile file(RELEASE_STORE_FILE)\n"
        "            storePassword RELEASE_STORE_PASSWORD\n"
        "            keyAlias RELEASE_KEY_ALIAS\n"
        "            keyPassword RELEASE_KEY_PASSWORD\n"
        "        }\n"
        "    }\n    buildTypes {",
    )
    print("  signingConfigs.release ajouté")

# 3b. buildType release utilise signingConfigs.release
content = re.sub(
    r"(buildTypes \{.*?release \{.*?)signingConfig signingConfigs\.debug",
    r"\1signingConfig signingConfigs.release",
    content,
    count=1,
    flags=re.DOTALL,
)

# 3c. Nommage APK — doit être DANS le bloc android {}
# Le bloc android {} se termine par la ligne "}" avant "// Apply static values"
if "outputFileName" not in content:
    naming = (
        f'    applicationVariants.all {{ variant ->\n'
        f'        variant.outputs.all {{\n'
        f'            if (variant.buildType.name == "release") {{\n'
        f'                outputFileName = "ghostposter-{version}.apk"\n'
        f'            }}\n'
        f'        }}\n'
        f'    }}\n'
    )
    # Insère avant la fermeture du bloc android {} (la } seule sur sa ligne
    # qui précède le commentaire "// Apply static values")
    content = content.replace(
        "\n}\n\n// Apply static values",
        f"\n    {naming.rstrip()}\n}}\n\n// Apply static values",
    )
    print(f'  APK nommé ghostposter-{version}.apk')

BUILD_GRADLE.write_text(content)
print(f"✓ Android configuré pour v{version}")
