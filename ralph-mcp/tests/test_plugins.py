#!/usr/bin/env python3
"""
Tests unitaires pour l'architecture de plugins Ralph MCP.

Vérifie que tous les plugins sont correctement chargés et exposent les outils attendus.
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_core_imports():
    """Test que les modules core s'importent correctement."""
    print("🧪 Test 1: Imports core...")

    from core import log_debug, log_info, count_files, read_project_context
    assert callable(log_debug)
    assert callable(log_info)
    assert callable(count_files)
    assert callable(read_project_context)

    print("   ✓ Core imports OK")


def test_plugin_base():
    """Test que la classe de base Plugin fonctionne."""
    print("🧪 Test 2: Plugin base...")

    from plugins.base import RalphPlugin
    from mcp.types import Tool, TextContent

    # Créer un plugin de test
    class TestPlugin(RalphPlugin):
        def get_tools(self):
            return [
                Tool(
                    name="test_tool",
                    description="Test tool",
                    inputSchema={"type": "object", "properties": {}}
                )
            ]

        async def execute_tool(self, name, arguments):
            return [TextContent(type="text", text="OK")]

    plugin = TestPlugin()
    assert len(plugin.get_tools()) == 1
    assert plugin.has_tool("test_tool")
    assert not plugin.has_tool("nonexistent")

    print("   ✓ Plugin base OK")


def test_plugin_loader():
    """Test que le PluginLoader fonctionne."""
    print("🧪 Test 3: PluginLoader...")

    from plugins.loader import PluginLoader
    from plugins.base import RalphPlugin
    from mcp.types import Tool, TextContent

    # Créer des plugins de test
    class Plugin1(RalphPlugin):
        def get_tools(self):
            return [
                Tool(
                    name="tool1",
                    description="Tool 1",
                    inputSchema={"type": "object", "properties": {}}
                )
            ]

        async def execute_tool(self, name, arguments):
            return [TextContent(type="text", text="tool1")]

    class Plugin2(RalphPlugin):
        def get_tools(self):
            return [
                Tool(
                    name="tool2",
                    description="Tool 2",
                    inputSchema={"type": "object", "properties": {}}
                )
            ]

        async def execute_tool(self, name, arguments):
            return [TextContent(type="text", text="tool2")]

    loader = PluginLoader()
    loader.register(Plugin1())
    loader.register(Plugin2())

    # Vérifier que tous les outils sont disponibles
    all_tools = loader.get_all_tools()
    assert len(all_tools) == 2
    tool_names = [t.name for t in all_tools]
    assert "tool1" in tool_names
    assert "tool2" in tool_names

    # Vérifier le routing
    assert loader.has_tool("tool1")
    assert loader.has_tool("tool2")

    print("   ✓ PluginLoader OK")


def test_all_plugins_loadable():
    """Test que tous les plugins réels peuvent être importés."""
    print("🧪 Test 4: Chargement des plugins réels...")

    from plugins.session.plugin import SessionPlugin
    from plugins.memory.plugin import MemoryPlugin
    from plugins.pattern.plugin import PatternPlugin
    from plugins.context.plugin import ContextPlugin
    from plugins.warpgrep.plugin import WarpGrepPlugin
    from plugins.killer.plugin import KillerFeaturesPlugin

    # Vérifier que ce sont des sous-classes de RalphPlugin
    from plugins.base import RalphPlugin

    assert issubclass(SessionPlugin, RalphPlugin)
    assert issubclass(MemoryPlugin, RalphPlugin)
    assert issubclass(PatternPlugin, RalphPlugin)
    assert issubclass(ContextPlugin, RalphPlugin)
    assert issubclass(WarpGrepPlugin, RalphPlugin)
    assert issubclass(KillerFeaturesPlugin, RalphPlugin)

    print("   ✓ Tous les plugins importables")


def test_plugin_tools_count():
    """Test que chaque plugin expose le bon nombre d'outils."""
    print("🧪 Test 5: Nombre d'outils par plugin...")

    from plugins.session.plugin import SessionPlugin
    from plugins.memory.plugin import MemoryPlugin
    from plugins.pattern.plugin import PatternPlugin
    from plugins.context.plugin import ContextPlugin
    from plugins.warpgrep.plugin import WarpGrepPlugin
    from plugins.killer.plugin import KillerFeaturesPlugin

    # Créer des instances avec des mocks
    def mock_get_db():
        return None

    def mock_get_current_session_id():
        return "test-session"

    def mock_save_session(*args):
        pass

    def mock_load_session():
        return {}

    def mock_clear_session():
        pass

    def mock_api_call(*args):
        return {}

    session_plugin = SessionPlugin(mock_get_db, mock_save_session, mock_load_session, mock_clear_session)
    memory_plugin = MemoryPlugin(mock_get_db, mock_get_current_session_id)
    pattern_plugin = PatternPlugin(mock_get_db, mock_get_current_session_id)
    context_plugin = ContextPlugin(mock_get_db, mock_get_current_session_id, mock_api_call)
    warpgrep_plugin = WarpGrepPlugin()
    killer_plugin = KillerFeaturesPlugin(mock_get_db, mock_get_current_session_id)

    # Vérifier le nombre d'outils
    session_tools = session_plugin.get_tools()
    memory_tools = memory_plugin.get_tools()
    pattern_tools = pattern_plugin.get_tools()
    context_tools = context_plugin.get_tools()
    warpgrep_tools = warpgrep_plugin.get_tools()
    killer_tools = killer_plugin.get_tools()

    print(f"   - SessionPlugin: {len(session_tools)} outils")
    print(f"   - MemoryPlugin: {len(memory_tools)} outils")
    print(f"   - PatternPlugin: {len(pattern_tools)} outils")
    print(f"   - ContextPlugin: {len(context_tools)} outils")
    print(f"   - WarpGrepPlugin: {len(warpgrep_tools)} outils")
    print(f"   - KillerFeaturesPlugin: {len(killer_tools)} outils")

    total_tools = (
        len(session_tools) +
        len(memory_tools) +
        len(pattern_tools) +
        len(context_tools) +
        len(warpgrep_tools) +
        len(killer_tools)
    )

    print(f"   ✓ Total: {total_tools} outils")

    # Vérifications minimales
    assert len(session_tools) >= 5  # malloc, session_info, list, restore, delete, cleanup
    assert len(memory_tools) >= 3  # recall, add_memory, search
    assert len(pattern_tools) >= 3  # scan, learn, get, list
    assert len(context_tools) >= 5  # status, compress, checkpoint, should_fold, fold, free
    assert len(warpgrep_tools) >= 1  # warpgrep
    assert len(killer_tools) >= 3  # fast_apply, orchestrate, cross_search, inherit_memories


def test_expected_tool_names():
    """Test que les outils attendus sont présents."""
    print("🧪 Test 6: Noms des outils attendus...")

    from plugins.session.plugin import SessionPlugin
    from plugins.memory.plugin import MemoryPlugin
    from plugins.pattern.plugin import PatternPlugin
    from plugins.context.plugin import ContextPlugin
    from plugins.warpgrep.plugin import WarpGrepPlugin
    from plugins.killer.plugin import KillerFeaturesPlugin

    # Mock functions
    session_plugin = SessionPlugin(lambda: None, lambda *a: None, lambda: {}, lambda: None)
    memory_plugin = MemoryPlugin(lambda: None, lambda: "test")
    pattern_plugin = PatternPlugin(lambda: None, lambda: "test")
    context_plugin = ContextPlugin(lambda: None, lambda: "test", lambda *a, **k: {})
    warpgrep_plugin = WarpGrepPlugin()
    killer_plugin = KillerFeaturesPlugin(lambda: None, lambda: "test")

    # Outils attendus (non exhaustif)
    expected_session_tools = [
        "ralph_malloc",
        "ralph_session_info",
        "ralph_list_sessions",
        "ralph_restore_session",
        "ralph_delete_session",
        "ralph_cleanup_sessions",
    ]

    expected_memory_tools = [
        "ralph_recall",
        "ralph_add_memory",
        "ralph_search",
        "ralph_curate",
    ]

    expected_pattern_tools = [
        "ralph_scan_project",
        "ralph_learn_pattern",
        "ralph_get_pattern",
        "ralph_list_patterns",
    ]

    expected_context_tools = [
        "ralph_get_status",
        "ralph_compress",
        "ralph_checkpoint",
        "ralph_should_fold",
        "ralph_fold",
        "ralph_free",
    ]

    expected_warpgrep_tools = ["ralph_warpgrep"]

    expected_killer_tools = [
        "ralph_fast_apply",
        "ralph_orchestrate",
        "ralph_cross_search",
        "ralph_inherit_memories",
    ]

    all_tools = (
        session_plugin.get_tools() +
        memory_plugin.get_tools() +
        pattern_plugin.get_tools() +
        context_plugin.get_tools() +
        warpgrep_plugin.get_tools() +
        killer_plugin.get_tools()
    )

    tool_names = {t.name for t in all_tools}

    # Vérifier que les outils attendus sont présents
    for expected in expected_session_tools:
        assert expected in tool_names, f"Manquant: {expected}"

    for expected in expected_memory_tools:
        assert expected in tool_names, f"Manquant: {expected}"

    for expected in expected_pattern_tools:
        assert expected in tool_names, f"Manquant: {expected}"

    for expected in expected_context_tools:
        assert expected in tool_names, f"Manquant: {expected}"

    for expected in expected_warpgrep_tools:
        assert expected in tool_names, f"Manquant: {expected}"

    for expected in expected_killer_tools:
        assert expected in tool_names, f"Manquant: {expected}"

    print(f"   ✓ Tous les outils attendus présents ({len(tool_names)} outils)")


def main():
    """Exécuter tous les tests."""
    print("=" * 60)
    print("RALPH MCP - Tests Unitaires Plugin Architecture")
    print("=" * 60)
    print()

    tests = [
        test_core_imports,
        test_plugin_base,
        test_plugin_loader,
        test_all_plugins_loadable,
        test_plugin_tools_count,
        test_expected_tool_names,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"   ✗ ÉCHEC: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
        print()

    print("=" * 60)
    print(f"RÉSULTAT: {passed} réussis, {failed} échoués")
    print("=" * 60)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
