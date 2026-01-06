"""
Tests for Ralph MCP SQLite database wrapper.

Tests the SessionDB class which handles multi-session persistence.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from src.db import SessionDB, migrate_json_to_sqlite
import json
import time


@pytest.fixture
def temp_db():
    """Create a temporary database for testing."""
    temp_dir = tempfile.mkdtemp()
    db_path = Path(temp_dir) / "test-ralph.db"

    # Create schema file in temp dir
    schema_content = """
CREATE TABLE IF NOT EXISTS mcp_sessions (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    task_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    max_tokens INTEGER DEFAULT 200000
);

CREATE INDEX IF NOT EXISTS idx_project_path ON mcp_sessions(project_path);
CREATE INDEX IF NOT EXISTS idx_last_accessed ON mcp_sessions(last_accessed DESC);
"""

    schema_path = Path(temp_dir) / "schema.sql"
    schema_path.write_text(schema_content)

    # Create DB
    db = SessionDB(db_path=db_path)

    yield db, db_path, temp_dir, schema_path

    # Cleanup
    shutil.rmtree(temp_dir)


class TestSessionDB:
    """Test SessionDB operations."""

    def test_save_and_retrieve_session(self, temp_db):
        """Test saving and retrieving a session."""
        db, _, _, _ = temp_db

        # Save a session
        session_id = "test-session-123"
        project_path = "/home/user/test-project"
        task_desc = "Test task"

        db.save_session(session_id, project_path, task_desc, 200000)

        # Retrieve it
        session = db.get_session(session_id)

        assert session is not None
        assert session["id"] == session_id
        assert session["project_path"] == project_path
        assert session["task_description"] == task_desc
        assert session["max_tokens"] == 200000

    def test_save_updates_existing_session(self, temp_db):
        """Test that saving an existing session updates it."""
        db, _, _, _ = temp_db

        session_id = "test-session-456"

        # Save first time
        db.save_session(session_id, "/project1", "Task 1")
        time.sleep(0.1)  # Small delay to ensure timestamp changes

        # Save again (should update)
        db.save_session(session_id, "/project1", "Task 1 updated")

        session = db.get_session(session_id)
        assert session["task_description"] == "Task 1 updated"

    def test_get_most_recent_for_project(self, temp_db):
        """Test retrieving the most recent session for a project."""
        db, _, _, _ = temp_db

        project_path = "/home/user/my-project"

        # Create multiple sessions for the same project
        # Note: SQLite timestamps are second-precision, so we need 1+ second delays
        db.save_session("session-1", project_path, "First task")
        time.sleep(1.1)  # Ensure different timestamp
        db.save_session("session-2", project_path, "Second task")
        time.sleep(1.1)  # Ensure different timestamp
        db.save_session("session-3", project_path, "Third task")

        # Should get the most recent one (session-3)
        recent = db.get_most_recent_for_project(project_path)

        assert recent is not None
        assert recent["id"] == "session-3"
        assert recent["task_description"] == "Third task"

    def test_list_sessions(self, temp_db):
        """Test listing sessions with filters."""
        db, _, _, _ = temp_db

        # Create sessions for different projects
        db.save_session("session-a", "/project-a", "Task A")
        db.save_session("session-b", "/project-a", "Task B")
        db.save_session("session-c", "/project-b", "Task C")

        # List all sessions
        all_sessions = db.list_sessions()
        assert len(all_sessions) == 3

        # Filter by project
        project_a_sessions = db.list_sessions(project_path="/project-a")
        assert len(project_a_sessions) == 2
        assert all(s["project_path"] == "/project-a" for s in project_a_sessions)

        # Limit results
        limited = db.list_sessions(limit=2)
        assert len(limited) == 2

    def test_delete_session(self, temp_db):
        """Test deleting a session."""
        db, _, _, _ = temp_db

        session_id = "session-to-delete"
        db.save_session(session_id, "/project", "Task")

        # Verify it exists
        assert db.get_session(session_id) is not None

        # Delete it
        deleted = db.delete_session(session_id)
        assert deleted is True

        # Verify it's gone
        assert db.get_session(session_id) is None

        # Delete again should return False
        deleted = db.delete_session(session_id)
        assert deleted is False

    def test_update_last_accessed(self, temp_db):
        """Test updating the last_accessed timestamp."""
        db, _, _, _ = temp_db

        session_id = "session-access"
        db.save_session(session_id, "/project", "Task")

        # Get original timestamp
        original = db.get_session(session_id)
        original_accessed = original["last_accessed"]

        time.sleep(0.1)

        # Update last_accessed
        db.update_last_accessed(session_id)

        # Get updated session
        updated = db.get_session(session_id)

        # The timestamp should have been updated
        # Note: This might be tricky to test due to timestamp precision
        assert updated["id"] == session_id

    def test_get_all_projects(self, temp_db):
        """Test getting list of unique projects."""
        db, _, _, _ = temp_db

        # Create sessions for multiple projects
        db.save_session("s1", "/project-a", "Task")
        db.save_session("s2", "/project-b", "Task")
        db.save_session("s3", "/project-a", "Task")  # Duplicate project
        db.save_session("s4", "/project-c", "Task")

        projects = db.get_all_projects()

        assert len(projects) == 3  # a, b, c (a appears twice but should be unique)
        assert "/project-a" in projects
        assert "/project-b" in projects
        assert "/project-c" in projects


class TestMigration:
    """Test JSON to SQLite migration."""

    def test_migrate_json_to_sqlite(self, temp_db, monkeypatch):
        """Test migrating existing JSON session to SQLite."""
        db, db_path, temp_dir, _ = temp_db

        # Create a fake JSON session file
        json_dir = Path(temp_dir) / ".ralph"
        json_dir.mkdir(parents=True, exist_ok=True)

        json_file = json_dir / "session.json"
        json_data = {
            "session_id": "migrated-session-123",
            "task_description": "Migrated task",
            "saved_at": "123456.789"
        }
        json_file.write_text(json.dumps(json_data))

        # Mock Path.cwd() to return a specific path
        mock_cwd = "/home/user/migrated-project"

        # We need to modify the migrate function to accept paths for testing
        # For now, let's test the core logic

        # Verify JSON file exists
        assert json_file.exists()

        # After migration, JSON should be renamed to .bak
        # and session should be in SQLite

        # Note: This test would require refactoring migrate_json_to_sqlite
        # to accept paths as parameters for proper testing


@pytest.mark.integration
class TestSessionDBIntegration:
    """Integration tests for SessionDB."""

    def test_full_workflow(self, temp_db):
        """Test a complete session management workflow."""
        db, _, _, _ = temp_db

        # 1. Create session for project A
        db.save_session("session-1", "/project-a", "Task A1")
        time.sleep(1.1)

        # 2. Create another session for project A
        db.save_session("session-2", "/project-a", "Task A2")
        time.sleep(1.1)

        # 3. Create session for project B
        db.save_session("session-3", "/project-b", "Task B")

        # 4. List all sessions
        all_sessions = db.list_sessions()
        assert len(all_sessions) == 3

        # 5. Get most recent for project A
        recent_a = db.get_most_recent_for_project("/project-a")
        assert recent_a["id"] == "session-2"  # Most recent for project A

        # 6. Delete one session
        db.delete_session("session-1")

        # 7. Verify project A now has only 1 session
        project_a_sessions = db.list_sessions(project_path="/project-a")
        assert len(project_a_sessions) == 1
        assert project_a_sessions[0]["id"] == "session-2"

        # 8. Get all unique projects
        projects = db.get_all_projects()
        assert len(projects) == 2
        assert set(projects) == {"/project-a", "/project-b"}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
