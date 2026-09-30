import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("check_deploy", ROOT / "scripts/check_deploy.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DeploymentChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in ["railway.json", "backend/package.json", "backend/Dockerfile", "Dockerfile", "README.md"]:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text((ROOT / name).read_text())

    def test_current_config(self):
        self.assertEqual(module.check(self.root), [])

    def test_wrong_docker_path(self):
        p = self.root / "railway.json"
        data = json.loads(p.read_text())
        data["build"]["dockerfilePath"] = "Dockerfile.old"
        p.write_text(json.dumps(data))
        self.assertTrue(module.check(self.root))

    def test_old_node(self):
        p = self.root / "backend/Dockerfile"
        p.write_text(p.read_text().replace("node:22-", "node:20-"))
        self.assertTrue(module.check(self.root))

    def test_missing_file(self):
        (self.root / "railway.json").unlink()
        self.assertTrue(module.check(self.root))

    def test_stale_root_docker(self):
        (self.root / "Dockerfile").write_text("FROM node:20-alpine")
        self.assertTrue(module.check(self.root))

    def test_legacy_readme(self):
        (self.root / "README.md").write_text("rootDir=backend")
        self.assertTrue(module.check(self.root))

    def test_wrong_healthcheck(self):
        p = self.root / "railway.json"
        data = json.loads(p.read_text())
        data["deploy"]["healthcheckPath"] = "/api/health"
        p.write_text(json.dumps(data))
        self.assertTrue(module.check(self.root))
