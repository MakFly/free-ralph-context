"""
Pytest configuration and shared fixtures for Ralph MCP tests.
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def sample_session_data():
    """Sample session data for testing."""
    return {
        "id": "test-session-abc123",
        "project_path": "/home/user/test-project",
        "task_description": "Test authentication flow",
        "max_tokens": 200000
    }


@pytest.fixture
def multiple_sessions_data():
    """Multiple sample sessions for testing list/filter operations."""
    return [
        {
            "id": "session-1",
            "project_path": "/project-a",
            "task_description": "Task A1",
            "max_tokens": 150000
        },
        {
            "id": "session-2",
            "project_path": "/project-a",
            "task_description": "Task A2",
            "max_tokens": 200000
        },
        {
            "id": "session-3",
            "project_path": "/project-b",
            "task_description": "Task B",
            "max_tokens": 100000
        }
    ]


@pytest.fixture
def mock_project_files():
    """Mock project file structure for framework detection tests."""
    return {
        "symfony": {
            "composer.json": {
                "require": {
                    "symfony/console": "^6.0",
                    "symfony/http-foundation": "^6.0",
                    "symfony/framework-bundle": "^6.0"
                }
            },
            "files": [
                "src/Controller/AuthController.php",
                "src/Security/Authenticator.php"
            ]
        },
        "laravel": {
            "composer.json": {
                "require": {
                    "laravel/framework": "^10.0"
                }
            }
        },
        "nextjs": {
            "package.json": {
                "dependencies": {
                    "next": "^14.0.0",
                    "react": "^18.0.0"
                }
            }
        },
        "react": {
            "package.json": {
                "dependencies": {
                    "react": "^18.0.0",
                    "@vitejs/plugin-react": "^4.0.0"
                }
            }
        }
    }
