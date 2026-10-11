import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[3]
SCRIPTS = REPO / "spotter-infrastructure/scripts"


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_real_rsync_updates_all_services_and_preserves_server_state(self):
        source, destination = self.root / "source", self.root / "destination"
        destination.mkdir()
        for name in ("spotter-frontend", "spotter-backend", "spotter-infrastructure"):
            src, dest = source / name, destination / name
            src.mkdir(parents=True)
            dest.mkdir()
            (src / "code.txt").write_text("new code")
            (src / ".env").write_text("never ship this")
            (src / ".env.example").write_text("updated placeholder")
            (dest / ".env").write_text("server secret")
            (dest / ".env.development").write_text("development secret")
            (dest / "db.sqlite3").write_text("runtime database")
            (dest / "obsolete-code.txt").write_text("stale code")
            (dest / "node_modules").mkdir()
            (dest / "node_modules/server-state").write_text("preserved")
        (destination / "backups").mkdir()
        (destination / "backups/existing.sql").write_text("database backup")
        subprocess.run(["bash", str(SCRIPTS / "sync-development.sh"), str(source), str(destination)], check=True, capture_output=True)
        for name in ("spotter-frontend", "spotter-backend", "spotter-infrastructure"):
            dest = destination / name
            self.assertEqual((dest / "code.txt").read_text(), "new code")
            self.assertEqual((dest / ".env.example").read_text(), "updated placeholder")
            self.assertEqual((dest / ".env").read_text(), "server secret")
            self.assertEqual((dest / ".env.development").read_text(), "development secret")
            self.assertEqual((dest / "db.sqlite3").read_text(), "runtime database")
            self.assertFalse((dest / "obsolete-code.txt").exists())
            self.assertTrue((dest / "node_modules/server-state").exists())
        self.assertTrue((destination / "backups/existing.sql").exists())

    def rollout(self, failure="", existing=True):
        workspace = self.root / "workspace"
        infra = workspace / "spotter-infrastructure"
        infra.mkdir(parents=True)
        (infra / ".env.development").write_text("FAKE_SECRET=do-not-print")
        (infra / "workspace.dockerignore").write_text("*\n")
        binary = self.root / "bin"
        binary.mkdir()
        docker = binary / "docker"
        docker.write_text("""#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
with open(os.environ['DOCKER_COMMAND_LOG'], 'a') as log:
    log.write(json.dumps(args) + '\\n')
joined = ' '.join(args)
if os.environ.get('FAIL_OPERATION') and os.environ['FAIL_OPERATION'] in joined:
    sys.exit(1)
if 'ps --status running' in joined and os.environ['EXISTING_DATABASE'] == 'true':
    print('existing-postgres-container')
if 'pg_dump' in joined:
    print('database-backup-content')
""")
        docker.chmod(0o755)
        command_log = self.root / "commands.jsonl"
        result = subprocess.run(["bash", str(SCRIPTS / "deploy-development.sh"), str(workspace)], env={
            **os.environ, "PATH": str(binary) + ":" + os.environ["PATH"],
            "DOCKER_COMMAND_LOG": str(command_log), "FAIL_OPERATION": failure,
            "EXISTING_DATABASE": str(existing).lower(),
        }, capture_output=True, text=True)
        commands = [json.loads(line) for line in command_log.read_text().splitlines()]
        return result, commands, workspace

    def test_complete_rollout_backs_up_before_restart_and_checks_readiness(self):
        result, commands, workspace = self.rollout()
        self.assertEqual(result.returncode, 0, result.stderr)
        joined = [" ".join(command) for command in commands]
        self.assertLess(next(i for i, cmd in enumerate(joined) if "pg_dump" in cmd), next(i for i, cmd in enumerate(joined) if "up -d" in cmd))
        self.assertTrue(any("build spotter-backend spotter-frontend webserver" in cmd for cmd in joined))
        self.assertTrue(any("/api/ready" in cmd and "sh -ec" in cmd for cmd in joined))
        backups = list((workspace / "backups").glob("*.sql"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].stat().st_mode & 0o777, 0o600)
        self.assertNotIn("do-not-print", result.stdout + result.stderr)
        self.assertFalse(any("down" in command or "prune" in command for command in commands))

    def test_failed_backup_prevents_migrations_and_restart(self):
        result, commands, workspace = self.rollout(failure="pg_dump")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any("up" in command for command in commands))
        self.assertEqual(list((workspace / "backups").glob("*.sql")), [])

    def test_failed_build_keeps_existing_services_running(self):
        result, commands, _ = self.rollout(failure="build")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any("up" in command or "down" in command for command in commands))

    def test_failed_readiness_cannot_report_success(self):
        result, _, _ = self.rollout(failure="/api/ready")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("are ready", result.stdout)

    def test_first_install_does_not_claim_existing_database_backup(self):
        result, commands, workspace = self.rollout(existing=False)
        self.assertEqual(result.returncode, 0)
        self.assertFalse(any("pg_dump" in " ".join(command) for command in commands))
        self.assertFalse((workspace / "backups").exists())
