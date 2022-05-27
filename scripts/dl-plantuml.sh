#!/usr/bin/env bash
set -o errexit

wget -q --show-progress --progress=bar -O  plantuml.jar https://github.com/plantuml/plantuml/releases/download/v1.2022.5/plantuml-1.2022.5.jar
chmod +x plantuml.jar
mv plantuml.jar lib/plantuml.jar
