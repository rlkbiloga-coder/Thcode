"""Validate tracked deployment configuration without reading secrets or networks."""
import json
from pathlib import Path
import sys


def check(root):
    errors = []
    try:
        railway = json.loads((root / "railway.json").read_text())
        package = json.loads((root / "backend/package.json").read_text())
        docker = (root / "backend/Dockerfile").read_text()
        root_docker = (root / "Dockerfile").read_text()
        readme = (root / "README.md").read_text()
    except (OSError, ValueError):
        return ["Missing or invalid tracked deployment files"]
    if railway.get("build", {}).get("dockerfilePath") != "backend/Dockerfile":
        errors.append("Railway must use backend/Dockerfile with repository-root context")
    if railway.get("build", {}).get("builder") != "DOCKERFILE":
        errors.append("Railway builder must be DOCKERFILE")
    if railway.get("deploy", {}).get("healthcheckPath") != "/api/ready":
        errors.append("Railway healthcheck must use /api/ready")
    if package.get("engines", {}).get("node") != ">=22":
        errors.append("Backend Node requirement changed: review Docker and CI together")
    bases = [line.split()[1] for line in docker.splitlines() if line.startswith("FROM ")]
    if not bases or any(not base.startswith("node:22-") for base in bases):
        errors.append("Docker must use Node 22 in every stage")
    if "COPY backend/" not in docker:
        errors.append("Docker must copy backend files from repository-root context")
    if root_docker != docker:
        errors.append("Root and backend Dockerfiles must stay synchronized")
    if "rootDir=backend" in readme:
        errors.append("README contains legacy Railway backend-root deployment link")
    return errors


if __name__ == "__main__":
    errors = check(Path(__file__).resolve().parents[1])
    for error in errors:
        print("FAIL:", error)
    if not errors:
        print("PASS: tracked deployment configuration (not live Railway validation)")
    sys.exit(bool(errors))
