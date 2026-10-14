from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
from threading import Thread
import unittest

ROOT = Path(__file__).resolve().parents[2]


class SmokeChecks(unittest.TestCase):
    def check_response(self, status, body):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(status)
                self.end_headers()
                self.wfile.write(body.encode())
            def log_message(self, *args):
                pass
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            return subprocess.run(["bash", str(ROOT / "scripts/smoke_ready.sh"),
                "http://127.0.0.1:" + str(server.server_port)], capture_output=True, text=True, timeout=20)
        finally:
            server.shutdown()
            server.server_close()
            worker.join()

    def test_ready(self):
        self.assertEqual(self.check_response(200, '{"status":"ready"}').returncode, 0)

    def test_disconnected(self):
        self.assertNotEqual(self.check_response(503, '{"status":"not_ready"}').returncode, 0)

    def test_invalid_response(self):
        self.assertNotEqual(self.check_response(200, '<html>not ready</html>').returncode, 0)

    def test_no_plaintext_remote_url(self):
        result = subprocess.run(["bash", str(ROOT / "scripts/smoke_ready.sh"),
            "http://example.com"], capture_output=True, text=True, timeout=5)
        self.assertNotEqual(result.returncode, 0)
