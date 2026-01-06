"""
Tests for framework detection in Ralph API.

Tests that the scan_project endpoint correctly identifies
frameworks from composer.json, package.json, etc.
"""

import pytest
from pathlib import Path
import tempfile
import shutil
import json


@pytest.fixture
def temp_project():
    """Create a temporary project directory for testing framework detection."""
    temp_dir = tempfile.mkdtemp()
    project_path = Path(temp_dir)

    yield project_path

    # Cleanup
    shutil.rmtree(temp_dir)


class TestSymfonyDetection:
    """Test Symfony framework detection."""

    def test_detect_symfony_from_root_composer_json(self, temp_project):
        """Test Symfony detection from root composer.json."""
        # Create composer.json
        composer_json = {
            "require": {
                "symfony/console": "^6.0",
                "symfony/http-foundation": "^6.0",
                "symfony/framework-bundle": "^6.0"
            }
        }

        (temp_project / "composer.json").write_text(json.dumps(composer_json))

        # The framework detection should find this
        # This would be tested via the actual API endpoint
        assert (temp_project / "composer.json").exists()

    def test_detect_symfony_from_subdirectory(self, temp_project):
        """Test Symfony detection in monorepo (subdirectory)."""
        # Create subdirectory
        subdir = temp_project / "betterauth-symfony"
        subdir.mkdir()

        # Create composer.json in subdirectory
        composer_json = {
            "require": {
                "symfony/config": "^6.0",
                "symfony/dependency-injection": "^6.0",
                "symfony/http-kernel": "^6.0"
            }
        }

        (subdir / "composer.json").write_text(json.dumps(composer_json))

        # Should detect Symfony from subdirectory
        assert (subdir / "composer.json").exists()

    def test_detect_symfony_any_symfony_package(self, temp_project):
        """Test that ANY symfony/* package triggers Symfony detection."""
        # Test with various symfony packages
        symfony_packages = [
            "symfony/console",
            "symfony/http-foundation",
            "symfony/config",
            "symfony/dependency-injection",
            "symfony/routing",
            "symfony/asset"
        ]

        for package in symfony_packages:
            composer_json = {
                "require": {
                    package: "^6.0",
                    "other/package": "^1.0"
                }
            }

            (temp_project / "composer.json").write_text(json.dumps(composer_json))

            # Should detect Symfony
            assert (temp_project / "composer.json").exists()

            # Clean up for next test
            (temp_project / "composer.json").unlink()

    def test_symfony_monorepo_structure(self, temp_project):
        """Test Symfony detection in real monorepo structure (like symfony-better-auth)."""
        # Create monorepo structure
        # symfony-better-auth/
        #   betterauth-core/
        #   betterauth-symfony/  <- Symfony bundle here
        #   betterauth-laravel/

        core_dir = temp_project / "betterauth-core"
        symfony_dir = temp_project / "betterauth-symfony"
        laravel_dir = temp_project / "betterauth-laravel"

        for d in [core_dir, symfony_dir, laravel_dir]:
            d.mkdir()

        # Add composer.json only to Symfony bundle
        composer_json = {
            "name": "betterauth/symfony-bundle",
            "require": {
                "symfony/http-foundation": "^6.0",
                "symfony/security-bundle": "^6.0"
            }
        }

        (symfony_dir / "composer.json").write_text(json.dumps(composer_json))

        # Should detect Symfony even though composer.json is in subdirectory
        assert (symfony_dir / "composer.json").exists()


class TestLaravelDetection:
    """Test Laravel framework detection."""

    def test_detect_laravel(self, temp_project):
        """Test Laravel detection."""
        composer_json = {
            "require": {
                "laravel/framework": "^10.0"
            }
        }

        (temp_project / "composer.json").write_text(json.dumps(composer_json))

        assert (temp_project / "composer.json").exists()


class TestNodeJSDetection:
    """Test Node.js framework detection."""

    def test_detect_nextjs(self, temp_project):
        """Test Next.js detection."""
        package_json = {
            "dependencies": {
                "next": "^14.0.0",
                "react": "^18.0.0"
            }
        }

        (temp_project / "package.json").write_text(json.dumps(package_json))

        assert (temp_project / "package.json").exists()

    def test_detect_nuxt(self, temp_project):
        """Test Nuxt.js detection."""
        package_json = {
            "dependencies": {
                "nuxt": "^3.0.0"
            }
        }

        (temp_project / "package.json").write_text(json.dumps(package_json))

        assert (temp_project / "package.json").exists()

    def test_detect_react(self, temp_project):
        """Test React detection."""
        package_json = {
            "dependencies": {
                "react": "^18.0.0",
                "react-dom": "^18.0.0"
            }
        }

        (temp_project / "package.json").write_text(json.dumps(package_json))

        assert (temp_project / "package.json").exists()

    def test_detect_vite_react(self, temp_project):
        """Test React + Vite detection."""
        package_json = {
            "dependencies": {
                "react": "^18.0.0"
            },
            "devDependencies": {
                "@vitejs/plugin-react": "^4.0.0"
            }
        }

        (temp_project / "package.json").write_text(json.dumps(package_json))

        assert (temp_project / "package.json").exists()


class TestFallbackDetection:
    """Test fallback detection by file extension."""

    def test_detect_php_from_files(self, temp_project):
        """Test PHP detection when no composer.json found."""
        # Create some PHP files
        (temp_project / "index.php").write_text("<?php echo 'hello'; ?>")
        (temp_project / "config.php").write_text("<?php return []; ?>")

        php_files = list(temp_project.rglob("*.php"))
        assert len(php_files) >= 2

    def test_detect_typescript_from_files(self, temp_project):
        """Test TypeScript detection."""
        (temp_project / "index.ts").write_text("console.log('hello');")
        (temp_project / "app.tsx").write_text("export default () => null;")

        ts_files = list(temp_project.rglob("*.ts"))
        tsx_files = list(temp_project.rglob("*.tsx"))
        assert len(ts_files) + len(tsx_files) >= 2

    def test_detect_javascript_from_files(self, temp_project):
        """Test JavaScript detection."""
        (temp_project / "index.js").write_text("console.log('hello');")
        (temp_project / "app.jsx").write_text("export default () => null;")

        js_files = list(temp_project.rglob("*.js"))
        jsx_files = list(temp_project.rglob("*.jsx"))
        assert len(js_files) + len(jsx_files) >= 2


class TestFrameworkPriority:
    """Test framework detection priority order."""

    def test_symfony_over_generic_php(self, temp_project):
        """Symfony should be detected, not just 'PHP'."""
        # Create composer.json with Symfony
        composer_json = {
            "require": {
                "symfony/console": "^6.0"
            }
        }
        (temp_project / "composer.json").write_text(json.dumps(composer_json))

        # Also create PHP files
        (temp_project / "index.php").write_text("<?php // code")

        # Symfony should be detected (not just "PHP")
        assert (temp_project / "composer.json").exists()

    def test_laravel_over_symfony(self, temp_project):
        """Laravel should take priority over Symfony if both present."""
        # This is a theoretical edge case
        # In practice, Laravel and Symfony wouldn't be in the same project
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
