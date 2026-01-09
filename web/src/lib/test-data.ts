import {
  BrainIcon,
  BugIcon,
  CpuIcon,
  DatabaseIcon,
  FolderCodeIcon,
  LightbulbIcon,
  RocketIcon,
  SearchIcon,
  TerminalIcon,
  TestTube2Icon,
  ZapIcon,
} from "lucide-react";

export type TestCategory =
  | "basic"
  | "search"
  | "automation"
  | "advanced"
  | "tests"
  | "nextjs"
  | "react19"
  | "php-symfony"
  | "php-laravel"
  | "php-api-platform"
  | "vuejs"
  | "devops"
  | "codebase";

export type Difficulty = "easy" | "normal" | "hard";

export interface TestStep {
  id: string;
  title: string;
  description: string;
  prompt?: string;
  expected: string;
  code?: string;
  category: TestCategory;
  difficulty: Difficulty;
}

export const testSteps: Array<TestStep> = [
  // ===== BASICS =====
  {
    id: "check-mcp",
    title: "Vérifier la configuration MCP",
    description:
      "Avant de commencer, vérifiez que le serveur MCP free-context est bien configuré et actif.",
    code: "claude mcp list\n# Vous devriez voir : free-context: bun .../server/src/index.ts",
    expected: "Le serveur free-context apparaît dans la liste",
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "create-context",
    title: "Créer un contexte",
    description:
      "Créez votre premier contexte pour organiser vos connaissances.",
    prompt:
      'Utilise le MCP free-context pour créer un contexte "React Performance Tips" avec stack="react19", difficulty="easy", description "Astuces pour optimiser les applications React" et les tags react, performance, hooks',
    expected:
      "Claude utilise l'outil create_context avec stack et difficulty, retourne un ID de contexte",
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "mem-add-note",
    title: "mem - Ajouter une note",
    description: "Utilisez l'outil unifié mem pour ajouter une connaissance théorique.",
    prompt:
      'Utilise l\'outil mem avec action="add" pour créer une mémoire de type "note" dans le contexte "React Performance Tips" avec le titre "useMemo et useCallback", le contenu "useMemo sert à mémoriser le résultat d\'un calcul coûteux. useCallback sert à mémoriser une fonction pour éviter que les composants enfants ne re-render si la fonction change.", stack="react19", et difficulty="easy"',
    expected:
      'Claude utilise mem({action: "add", type: "note", stack: "react19", difficulty: "easy"})',
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "mem-add-snippet",
    title: "mem - Ajouter un snippet",
    description: "Ajoutez un bout de code réutilisable.",
    prompt:
      'Utilise mem avec action="add" pour créer une mémoire de type "snippet" avec le titre "Exemple de custom hook pour fetch" et le contenu "import { useState, useEffect } from \'react\'; export function useFetch<T>(url: string) { const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); useEffect(() => { fetch(url).then(res => res.json()).then(setData).finally(() => setLoading(false)); }, [url]); return { data, loading }; }"',
    expected: 'Claude utilise mem({action: "add", type: "snippet"})',
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "mem-add-reference",
    title: "mem - Ajouter une référence",
    description: "Ajoutez un lien vers une ressource externe.",
    prompt:
      'Utilise mem avec action="add" pour créer une mémoire de type "reference" avec le titre "React Compiler" et le contenu "Le React Compiler automatise les optimisations useMemo, useCallback, Memo." et l\'url "https://react.dev/learn/react-compiler"',
    expected: 'Claude utilise mem({action: "add", type: "reference"})',
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "list-contexts",
    title: "Lister les contextes",
    description: "Visualisez tous vos contextes.",
    prompt: "Liste tous les contextes disponibles avec free-context",
    expected: "Claude utilise list_contexts et affiche la liste",
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "create-with-stack",
    title: "Créer avec stack et difficulty",
    description:
      "Créez un contexte avec catégorisation par stack et niveau de difficulté.",
    prompt:
      'Crée un contexte "Next.js 16 Patterns" avec stack="nextjs", difficulty="normal", description "Patterns avancés Next.js 16" et les tags nextjs, patterns, performance',
    expected:
      'Claude utilise create_context avec stack="nextjs" et difficulty="normal"',
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "mem-add-with-stack",
    title: "mem - Ajouter mémoire avec stack",
    description:
      "Ajoutez une mémoire en spécifiant le stack technologique et la difficulté.",
    prompt:
      'Utilise mem avec action="add" pour créer une note dans le contexte "Next.js 16 Patterns" avec title="Server Actions", content="Les Server Actions permettent d\'exécuter du code serveur directement depuis les composants. Elles remplacent les API routes pour les mutations.", stack="nextjs", et difficulty="normal"',
    expected:
      'Claude utilise mem({action: "add", stack: "nextjs", difficulty: "normal"})',
    category: "basic",
    difficulty: "normal",
  },
  {
    id: "mem-list",
    title: "mem - Lister avec filtres",
    description: "Listez les mémoires avec pagination et filtres.",
    prompt:
      'Utilise mem avec action="list" pour lister toutes les mémoires avec stack="nextjs" et difficulty="normal", limit=10',
    expected:
      "Claude utilise mem({action: 'list'}) avec les filtres stack et difficulty, retourne memories et pagination",
    category: "basic",
    difficulty: "normal",
  },

  // ===== UNIFIED SEARCH =====
  {
    id: "search-memories-semantic",
    title: "search - Recherche mémoire (semantic)",
    description: "Recherchez dans les mémoires avec le mode sémantique.",
    prompt:
      'Utilise l\'outil search avec scope="memories" et mode="semantic" pour chercher "useMemo" avec limit=10',
    expected:
      "Claude utilise search({scope: 'memories', mode: 'semantic'}) et retourne les résultats avec scores",
    category: "search",
    difficulty: "normal",
  },
  {
    id: "search-code-pattern",
    title: "search - Recherche code (pattern)",
    description: "Recherchez dans le code avec le mode pattern (regex).",
    prompt:
      'Utilise l\'outil search avec scope="code", mode="pattern" pour chercher "export function" avec limit=10',
    expected:
      "Claude utilise search({scope: 'code', mode: 'pattern'}) et retourne les résultats mgrep",
    category: "search",
    difficulty: "normal",
  },
  {
    id: "search-all",
    title: "search - Recherche unifiée (all)",
    description: "Recherchez à la fois dans les mémoires et le code.",
    prompt:
      'Utilise l\'outil search avec scope="all" et mode="semantic" pour chercher "performance" avec limit=5',
    expected:
      "Claude utilise search({scope: 'all'}) et retourne les résultats de memories + code",
    category: "search",
    difficulty: "normal",
  },
  {
    id: "mem-search",
    title: "mem - Recherche FTS native",
    description: "Utilisez mem pour une recherche PostgreSQL FTS native.",
    prompt:
      'Utilise mem avec action="search" et query="optimization" avec limit=10',
    expected:
      "Claude utilise mem({action: 'search', query: '...'}) et retourne results et total",
    category: "search",
    difficulty: "normal",
  },
  {
    id: "smart-search-hybrid",
    title: "smart_search - Recherche hybride",
    description:
      "Recherche intelligente combinant FTS5 et similarité sémantique.",
    prompt:
      "Utilise smart_search pour trouver des mémoires sur l'optimisation des performances",
    expected: "Claude utilise smart_search avec scoring avancé",
    category: "search",
    difficulty: "normal",
  },
  {
    id: "find-relationships",
    title: "Trouver des relations",
    description: "Découvrez les connexions sémantiques entre vos mémoires.",
    prompt: 'Trouve les relations entre "useMemo" et les performances',
    expected: "Claude utilise find_relationships et montre les connexions",
    category: "search",
    difficulty: "normal",
  },

  // ===== CODEBASE INDEXING =====
  {
    id: "codebase-status",
    title: "codebase - Vérifier status",
    description: "Vérifiez si un watcher est actif et obtenez les statistiques.",
    prompt: "Utilise l'outil codebase avec action='status' pour voir l'état du watcher",
    expected:
      "Claude utilise codebase({action: 'status'}) et retourne watching et les stats",
    category: "codebase",
    difficulty: "easy",
  },
  {
    id: "codebase-index-dir",
    title: "codebase - Indexer un dossier",
    description: "Indexez un dossier pour permettre la recherche sémantique dans le code.",
    prompt:
      'Utilise l\'outil codebase avec action="index" et path="./src" pour indexer le dossier source',
    expected:
      "Claude utilise codebase({action: 'index', path: './src'}) et retourne les stats d'indexation",
    category: "codebase",
    difficulty: "easy",
  },
  {
    id: "codebase-index-file",
    title: "codebase - Indexer un fichier",
    description: "Indexez un fichier spécifique.",
    prompt:
      'Utilise l\'outil codebase avec action="index" et path="./src/tools/mem.ts" pour indexer ce fichier',
    expected:
      "Claude utilise codebase({action: 'index', path: './src/tools/mem.ts'}) et retourne les stats",
    category: "codebase",
    difficulty: "easy",
  },
  {
    id: "codebase-watch",
    title: "codebase - Démarrer watcher",
    description: "Démarrez un watcher automatique avec SafeWatcher (anti-fuite mémoire).",
    prompt:
      'Utilise l\'outil codebase avec action="watch" et path="./src" pour surveiller les changements',
    expected:
      "Claude utilise codebase({action: 'watch', path: './src'}) et démarre le watcher avec polling 30s",
    category: "codebase",
    difficulty: "normal",
  },
  {
    id: "codebase-stop",
    title: "codebase - Arrêter watcher",
    description: "Arrêtez le watcher actif.",
    prompt: "Utilise l'outil codebase avec action='stop' pour arrêter le watcher",
    expected:
      "Claude utilise codebase({action: 'stop'}) et arrête proprement le watcher",
    category: "codebase",
    difficulty: "easy",
  },
  {
    id: "search-indexed-code",
    title: "search - Chercher code indexé",
    description: "Recherchez dans le code précédemment indexé avec FTS PostgreSQL.",
    prompt:
      'Utilise search avec scope="code" et mode="semantic" pour chercher "memory" dans le code indexé',
    expected:
      "Claude utilise search({scope: 'code', mode: 'semantic'}) et interroge la table codebase_index",
    category: "codebase",
    difficulty: "normal",
  },

  // ===== AUTOMATION =====
  {
    id: "auto-analyze",
    title: "Analyse automatique de contexte",
    description: "Laissez Claude analyser et résumer vos contextes.",
    prompt:
      "Utilise auto_analyze_context pour analyser ce que nous avons sur React",
    expected: "Claude utilise auto_analyze_context et résume le contenu",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "auto-save",
    title: "Sauvegarde intelligente",
    description:
      "Sauvegardez automatiquement avec déduplication et catégorisation.",
    prompt:
      'Utilise auto_save_memory pour stocker : "React 19: use() hook remplace useContext pour lire les promesses dans les composants" avec stack="react19" et difficulty="normal"',
    expected:
      "Claude détecte les doublons, catégorise automatiquement, et stocke avec stack/difficulty",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "auto-memoize-test",
    title: "Auto-Mémoisation - Test de détection",
    description:
      "Vérifiez que le système détecte et sauvegarde automatiquement le contenu précieux.",
    code: "cd server && bun run test-automemoize",
    expected:
      "Le test affiche les contenus qui seraient auto-sauvegardés (code, solutions, décisions)",
    category: "automation",
    difficulty: "easy",
  },
  {
    id: "auto-memoize-code",
    title: "Auto-Mémoisation - CodeSnippet",
    description: "Testez la détection automatique de snippets de code.",
    prompt:
      'Utilise search avec scope="code" et mode="pattern" pour chercher "useMemo" dans le projet. Les résultats avec code devraient être auto-sauvegardés.',
    expected:
      'Les résultats avec code sont automatiquement sauvegardés (check la console: "[Auto-Memoize] ✅ Auto-saved")',
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "feed-mcp-workflow",
    title: "Alimenter le MCP - Workflow Guidé",
    description:
      "Guide complet pour apprendre au MCP via les outils search et auto_save_memory.",
    prompt:
      'Suis ce workflow pour apprendre au MCP : 1) Utilise search avec scope="code" pour chercher "mem" dans server/src. 2) Ensuite utilise auto_save_memory pour stocker ce que tu as découvert sur l\'outil mem unifié avec title="mem outil unifié", content="L\'outil mem regroupe add_memory, update_memory, delete_memory, get_memory, list_memories, search_memories en un seul outil avec action parameter", et stack="advanced".',
    expected:
      '1) search retourne les définitions de mem. 2) auto_save_memory stocke la connaissance. 3) La console affiche "[Auto-Memoize] ✅ Auto-saved: mem outil unifié"',
    category: "automation",
    difficulty: "easy",
  },

  // ===== SKILL /LEARN - Apprentissage de Technologies =====
  {
    id: "learn-basic",
    title: "/learn - Apprentissage basique",
    description:
      "Utilisez le skill /learn pour apprendre une technologie et la sauvegarder dans Free Context.",
    prompt: "/learn Symfony 8.0",
    expected:
      "Claude crée un context 'Symfony 8.0' avec stack=symfony, extrait les patterns clés, et les sauvegarde via auto_save_memory",
    category: "automation",
    difficulty: "easy",
  },
  {
    id: "learn-from-url",
    title: "/learn - Depuis documentation web",
    description:
      "Apprenez une technologie en fetchant sa documentation officielle.",
    prompt: "/learn API Platform 4 depuis https://api-platform.com/docs/",
    expected:
      "Claude utilise WebFetch pour récupérer la doc, extrait les patterns (snippets, notes), et les sauvegarde dans un context 'API Platform 4'",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "learn-from-codebase",
    title: "/learn - Patterns du projet",
    description:
      "Apprenez les patterns utilisés dans le projet actuel.",
    prompt: "/learn les patterns de ce projet",
    expected:
      "Claude utilise search pour scanner le code, identifie les patterns (architecture, conventions), et crée un context projet avec les findings",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "learn-compare",
    title: "/learn - Comparaison de versions",
    description:
      "Apprenez les différences entre deux versions d'une technologie.",
    prompt: "/learn les différences entre Symfony 7.4 et 8.0",
    expected:
      "Claude génère une note de type 'migration' avec les breaking changes, nouveautés, et patterns modifiés entre les deux versions",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "learn-multi",
    title: "/learn - Stack complet",
    description:
      "Apprenez plusieurs technologies liées en une seule commande.",
    prompt: "/learn Symfony 8 + API Platform 4 + Doctrine 3",
    expected:
      "Claude crée des contexts séparés pour chaque technologie et sauvegarde les patterns d'intégration entre elles",
    category: "automation",
    difficulty: "hard",
  },

  // ===== SMART SEARCH & RELATIONSHIPS =====
  {
    id: "smart-search-basic",
    title: "Smart Search - Recherche intelligente",
    description:
      "Utilisez smart_search pour une recherche hybride FTS + sémantique.",
    prompt: 'Utilise smart_search pour chercher "optimisation performance" avec limit=5',
    expected:
      "Claude utilise smart_search et retourne des résultats triés par pertinence sémantique, pas juste par mots-clés",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "find-similar-memories",
    title: "Find Similar - Découverte de connexions",
    description:
      "Trouvez les mémoires sémantiquement liées à une mémoire existante.",
    prompt: 'Utilise find_similar sur une mémoire existante avec threshold=0.3 et limit=5',
    expected:
      "Claude retourne les mémoires similaires avec leur pourcentage de similarité et le type de relation suggéré",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "create-relationship",
    title: "Create Relationship - Lier des mémoires",
    description:
      "Créez un lien explicite entre deux mémoires liées.",
    prompt: 'Crée une relationship de type "references" entre deux mémoires sur le même sujet',
    expected:
      "Claude utilise create_relationship et confirme la création du lien avec le type et la force",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "get-relationships-graph",
    title: "Get Relationships - Visualiser le graphe",
    description:
      "Visualisez toutes les connexions d'une mémoire dans le graphe de connaissances.",
    prompt: "Utilise get_relationships pour voir toutes les connexions d'une mémoire",
    expected:
      "Claude retourne les nodes (mémoires) et edges (relations) formant le graphe autour de la mémoire",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "build-relationships-dryrun",
    title: "Build Relationships - Dry Run",
    description:
      "Prévisualisez les relationships qui seraient créées sans les créer réellement.",
    prompt: "Utilise build_relationships avec dryRun=true pour voir quelles relations seraient créées entre mes mémoires",
    expected:
      "Claude retourne la liste des relationships potentielles avec leur type et pourcentage de similarité, sans les créer",
    category: "automation",
    difficulty: "easy",
  },
  {
    id: "build-relationships-all",
    title: "Build Relationships - Initialiser le graphe",
    description:
      "Scanne toutes les mémoires et crée automatiquement les relationships basées sur la similarité sémantique.",
    prompt: "Utilise build_relationships avec threshold=0.3 pour créer toutes les relations entre mes mémoires existantes",
    expected:
      "Claude scanne toutes les mémoires et crée les relationships. Affiche le nombre de relations créées et quelques exemples",
    category: "automation",
    difficulty: "normal",
  },

  // ===== CRUD OPERATIONS =====
  {
    id: "crud-get-context",
    title: "CRUD - get_context détails",
    description:
      "Récupérez les détails complets d'un contexte spécifique.",
    prompt:
      "1) Crée un contexte avec create_context. 2) Utilise get_context avec l'ID retourné pour voir les détails.",
    expected:
      "Claude utilise get_context avec l'ID du contexte et affiche ses détails complets (nom, description, tags, stack, difficulty)",
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "crud-update-context",
    title: "CRUD - update_context modification",
    description:
      "Modifiez un contexte existant (nom, description, tags, etc.).",
    prompt:
      "1) Crée un contexte. 2) Utilise update_context pour changer son nom et ajouter une description. 3) Vérifie avec get_context.",
    expected:
      "Claude utilise update_context pour modifier le contexte, get_context confirme les modifications",
    category: "basic",
    difficulty: "normal",
  },
  {
    id: "crud-delete-context",
    title: "CRUD - delete_context suppression",
    description:
      "Supprimez un contexte et toutes ses mémoires.",
    prompt:
      "1) Crée un contexte avec quelques mémoires. 2) Utilise delete_context pour le supprimer. 3) Vérifie avec list_contexts qu'il n'est plus là.",
    expected:
      "Claude utilise delete_context, list_contexts ne montre plus le contexte supprimé",
    category: "basic",
    difficulty: "normal",
  },
  {
    id: "mem-update",
    title: "mem - update_memory modification",
    description:
      "Modifiez le contenu d'une mémoire existante.",
    prompt:
      "1) Ajoute une mémoire avec mem action='add'. 2) Utilise mem avec action='update' pour changer son titre et contenu. 3) Vérifie la modification.",
    expected:
      "Claude utilise mem({action: 'update'}) avec id pour modifier la mémoire",
    category: "basic",
    difficulty: "normal",
  },
  {
    id: "mem-delete",
    title: "mem - delete_memory suppression",
    description:
      "Supprimez une mémoire spécifique d'un contexte.",
    prompt:
      "1) Ajoutez quelques mémoires à un contexte. 2) Utilise mem avec action='delete' pour en supprimer une. 3) Vérifie qu'elle n'est plus là.",
    expected:
      "Claude utilise mem({action: 'delete'}) avec id, la mémoire n'apparaît plus dans les recherches",
    category: "basic",
    difficulty: "normal",
  },
  {
    id: "mem-get",
    title: "mem - get_memory récupération",
    description:
      "Récupérez une mémoire spécifique par son ID.",
    prompt:
      "1) Créez une mémoire avec mem action='add'. 2) Utilise mem avec action='get' et l'ID retourné pour récupérer la mémoire complète.",
    expected:
      "Claude utilise mem({action: 'get', id: '...'}) et retourne la mémoire complète avec contenu",
    category: "basic",
    difficulty: "easy",
  },

  // ===== PMP2 TOKEN OPTIMIZATION =====
  {
    id: "pmp2-quick-search",
    title: "PMP2 - quick_search ultra-compact",
    description:
      "Utilisez quick_search pour une recherche qui ne retourne que IDs, titles et scores (~15 tokens/résultat).",
    prompt:
      'Utilise quick_search pour chercher "memoization" avec limit=10. Compare la taille de la réponse avec mem action="search".',
    expected:
      "Claude utilise quick_search, retourne une liste ultra-compacte avec id, title et relevance score pour chaque résultat",
    category: "advanced",
    difficulty: "normal",
  },
  {
    id: "pmp2-list-digests",
    title: "PMP2 - list_digests pour résumés",
    description:
      "Obtenez des résumés 1-phrase pour sélectionner les mémoires à développer (~20 tokens/résultat).",
    prompt:
      "1) D'abord utilise quick_search pour trouver des mémoires sur 'React'. 2) Ensuite utilise list_digests avec les IDs trouvés pour voir les résumés.",
    expected:
      "Claude combine quick_search + list_digests, affiche les résumés 1-phrase pour aider à choisir lesquels développer",
    category: "advanced",
    difficulty: "normal",
  },
  {
    id: "pmp2-expand-memory",
    title: "PMP2 - expand_memory avec delta",
    description:
      "Développez une mémoire en entier. Si déjà vue, retourne une référence (~200 tokens économisés).",
    prompt:
      "1) Trouve une mémoire avec quick_search. 2) Utilise expand_memory avec l'ID pour voir le contenu complet. 3) Réutilise expand_memory avec le même ID - vérifie que ça retourne 'reference' au lieu du contenu complet.",
    expected:
      "Claude utilise expand_memory, au premier appel retourne le contenu complet, au deuxième appel retourne une référence (économise des tokens)",
    category: "advanced",
    difficulty: "normal",
  },
  {
    id: "pmp2-session-stats",
    title: "PMP2 - session_stats pour économies",
    description:
      "Consultez les statistiques d'économie de tokens de la session courante.",
    prompt:
      "Utilise session_stats pour voir combien de tokens ont été économisés dans cette session.",
    expected:
      "Claude utilise session_stats et affiche les statistiques: requêtes, mémoires accédées, tokens économisés",
    category: "advanced",
    difficulty: "easy",
  },
  {
    id: "pmp2-clear-session",
    title: "PMP2 - clear_session pour redémarrer",
    description:
      "Réinitialisez l'état de session pour un nouveau départ (réinitialise les compteurs et mémoires vues).",
    prompt:
      "Utilise clear_session pour réinitialiser la session, puis vérifie avec session_stats que les compteurs sont à 0.",
    expected:
      "Claude utilise clear_session, session_stats affiche des compteurs réinitialisés (0 requêtes, 0 tokens économisés)",
    category: "advanced",
    difficulty: "easy",
  },

  // ===== UNIT TESTS =====
  {
    id: "run-tests",
    title: "Exécuter les tests unitaires",
    description: "Vérifiez que tous les tests passent.",
    code: "cd server\nbun test",
    expected: "Tous les tests passent (10+ pass, 0 fail)",
    category: "tests",
    difficulty: "normal",
  },

  // ===== DATABASE VERIFICATION =====
  {
    id: "verify-db",
    title: "Vérification base de données",
    description: "Vérifiez que les données sont bien stockées dans PostgreSQL.",
    code: "cd server\npsql -h localhost -U freecontext -d freecontext\n\nSELECT * FROM contexts;\nSELECT * FROM memories;\nSELECT * FROM relationships;\nSELECT * FROM codebase_index;",
    expected: "Les données apparaissent dans la base PostgreSQL avec la table codebase_index",
    category: "tests",
    difficulty: "easy",
  },

  // ===== NEXT.JS TESTS =====
  {
    id: "nextjs-easy-server-component",
    title: "Next.js 16 - Server Component de base",
    description: "Créez un Server Component simple qui récupère des données.",
    prompt:
      'Crée un Server Component Next.js 16 qui affiche une liste de utilisateurs récupérée depuis une API. Stocke ce snippet avec mem action="add", type="snippet", stack="nextjs", difficulty="easy".',
    expected:
      "Claude crée un composant avec async function, attend le fetch, et stocke le snippet avec stack/difficulty",
    category: "nextjs",
    difficulty: "easy",
  },
  {
    id: "nextjs-normal-cache-component",
    title: "Next.js 16 - Cache Component avec cacheLife",
    description:
      "Implémentez un Cache Component avec la nouvelle API cacheLife.",
    prompt:
      'Montre-moi comment implémenter un Cache Component dans Next.js 16 avec cacheLife("max") pour mettre en cache des données coûteuses. Stocke cette connaissance avec mem.',
    expected:
      "Claude explique les Cache Components avec cacheLife et stocke l'explication",
    category: "nextjs",
    difficulty: "normal",
  },
  {
    id: "nextjs-hard-proxy-migration",
    title: "Next.js 16 - Migration middleware vers proxy.ts",
    description:
      "Migrez un middleware.ts existant vers le nouveau proxy.ts avec params async.",
    prompt:
      'Explique comment migrer ce middleware vers le nouveau proxy.ts de Next.js 16 avec async params: export function middleware(request) { const auth = request.headers.get("authorization"); if (!auth) return new Response("Unauthorized", { status: 401 }); return NextResponse.next(); } Stocke la procédure avec mem.',
    expected:
      "Claude fournit le code proxy.ts migré avec export function proxy(request, { params }) et stocke le guide",
    category: "nextjs",
    difficulty: "hard",
  },

  // ===== REACT 19 TESTS =====
  {
    id: "react19-easy-use-hook",
    title: "React 19 - Hook use() de base",
    description: "Utilisez le nouveau hook use() pour lire une promesse.",
    prompt:
      "Montre un exemple simple du hook use() dans React 19 pour lire une promesse dans un composant. Stocke ce snippet avec mem.",
    expected:
      "Claude montre const data = use(fetchPromise) et stocke le snippet",
    category: "react19",
    difficulty: "easy",
  },
  {
    id: "react19-normal-useTransition-compiler",
    title: "React 19 - useTransition avec Compiler",
    description:
      "Combinez useTransition avec le React Compiler pour des transitions optimisées.",
    prompt:
      "Explique comment utiliser useTransition avec le React Compiler dans React 19 pour optimiser les mises à jour d'UI. Stocke cette connaissance avec mem.",
    expected:
      "Claude explique l'interaction entre useTransition et le Compiler et stocke",
    category: "react19",
    difficulty: "normal",
  },
  {
    id: "react19-hard-compiler-optimistic",
    title: "React 19 - Optimisation avancée avec Compiler + useOptimistic",
    description:
      "Implémentez un pattern avancé avec Compiler, useOptimistic et useActionState.",
    prompt:
      "Crée un exemple complet de formulaire optimiste avec React 19 combinant le React Compiler, useOptimistic et useActionState pour une expérience utilisateur fluide. Stocke ce pattern avec mem.",
    expected:
      "Claude fournit un formulaire complet avec les trois hooks et stocke le pattern",
    category: "react19",
    difficulty: "hard",
  },

  // ===== PHP SYMFONY TESTS =====
  {
    id: "symfony-easy-doctrine-entity",
    title: "Symfony 8 - Créer une entité Doctrine",
    description: "Créez une entité Doctrine de base avec attributs PHP 8.",
    prompt:
      'Génère une entité Doctrine Product pour Symfony 8 avec id, name, price en utilisant les attributs PHP 8. Stocke ce snippet avec mem action="add", type="snippet", stack="symfony", difficulty="easy".',
    expected:
      "Claude génère une classe avec #[ORM\\Entity] et attributs Doctrine, stocke le snippet avec stack/difficulty",
    category: "php-symfony",
    difficulty: "easy",
  },
  {
    id: "symfony-normal-console-command",
    title: "Symfony 8 - Commande Console personnalisée",
    description: "Créez une commande Console avec lazy-loading.",
    prompt:
      "Montre comment créer une commande Console Symfony 8 pour importer des produits avec le tag console.command et lazy-loading. Stocke cette connaissance avec mem.",
    expected:
      "Claude montre une classe AsCommand avec attributes et stocke le guide",
    category: "php-symfony",
    difficulty: "normal",
  },
  {
    id: "symfony-hard-messenger-async",
    title: "Symfony 8 - Messenger avec transport async",
    description:
      "Configurez Messenger avec un transport asynchrone et workers.",
    prompt:
      "Configure Messenger dans Symfony 8 avec transport RabbitMQ, des handlers async, et des retry policies pour gérer les échecs. Stocke la configuration complète avec mem.",
    expected:
      "Claude fournit config messenger.yaml, handler, et retry policy, stocke tout",
    category: "php-symfony",
    difficulty: "hard",
  },

  // ===== PHP LARAVEL TESTS =====
  {
    id: "laravel-easy-eloquent-model",
    title: "Laravel 12 - Créer un modèle Eloquent",
    description: "Créez un modèle Eloquent avec migrations.",
    prompt:
      'Génère un modèle Eloquent Post pour Laravel 12 avec title, content, published_at et sa migration. Stocke ces snippets avec mem action="add", type="snippet", stack="laravel", difficulty="easy".',
    expected:
      "Claude génère le modèle et la migration, stocke les deux avec stack/difficulty",
    category: "php-laravel",
    difficulty: "easy",
  },
  {
    id: "laravel-normal-action-pest",
    title: "Laravel 12 - Action class avec Pest",
    description: "Créez une Action class avec tests Pest.",
    prompt:
      "Crée une Action class CreateUser pour Laravel 12 avec validation, et ses tests Pest. Stocke ce pattern avec mem.",
    expected: "Claude crée l'Action avec invokable, les tests Pest, et stocke",
    category: "php-laravel",
    difficulty: "normal",
  },
  {
    id: "laravel-hard-jsonapi-resource",
    title: "Laravel 12 - Ressource JSON:API avec relations",
    description: "Implémentez une ressource JSON:API complète avec relations.",
    prompt:
      "Crée une ressource JSON:API pour Laravel 12 avec Author et Post, incluant les relations, les links, et le formattage des métadonnées selon json:api. Stocke cette implémentation avec mem.",
    expected:
      "Claude fournit JsonApiResource, ResourceCollection, relationships, et stocke",
    category: "php-laravel",
    difficulty: "hard",
  },

  // ===== PHP API PLATFORM TESTS =====
  {
    id: "apiplatform-easy-entity-resource",
    title: "API Platform - Entity APIResource basique",
    description: "Exposez une entité Doctrine via API Platform.",
    prompt:
      "Crée une entité Book Doctrine avec ApiResource annotation pour l'exposer via API Platform. Stocke ce snippet avec mem.",
    expected: "Claude crée l'entité avec #[ApiResource] et stocke",
    category: "php-api-platform",
    difficulty: "easy",
  },
  {
    id: "apiplatform-normal-filter-pagination",
    title: "API Platform - Filtres et pagination",
    description: "Ajoutez des filtres personnalisés et la pagination.",
    prompt:
      "Ajoute des filtres SearchFilter, DateFilter et une pagination customisée à l'entité Book dans API Platform. Stocke cette configuration avec mem.",
    expected: "Claude configure les filtres et la pagination, stocke la config",
    category: "php-api-platform",
    difficulty: "normal",
  },
  {
    id: "apiplatform-hard-custom-provider-validator",
    title: "API Platform - Provider et Validator custom",
    description: "Créez un custom item provider et un validator.",
    prompt:
      "Crée un custom ItemProvider pour charger les entités depuis Elasticsearch et un Validator custom pour API Platform avec DTOs. Stocke cette implémentation avec mem.",
    expected:
      "Claude fournit le provider, le validator, les DTOs et stocke",
    category: "php-api-platform",
    difficulty: "hard",
  },

  // ===== VUE.JS TESTS =====
  {
    id: "vuejs-easy-script-setup",
    title: "Vue.js 3.5 - Composition API avec script setup",
    description: "Créez un composant avec script setup syntax.",
    prompt:
      "Crée un composant Vue 3.5 avec <script setup> qui utilise ref et computed. Stocke ce snippet avec mem.",
    expected:
      "Claude crée un composant avec script setup, ref, computed, stocke",
    category: "vuejs",
    difficulty: "easy",
  },
  {
    id: "vuejs-normal-watcheffect-composable",
    title: "Vue.js 3.5 - Composable avec watchEffect",
    description: "Créez un composable réactif avec watchEffect.",
    prompt:
      "Crée un composable useLocalStorage pour Vue 3.5 avec watchEffect qui sync une ref avec localStorage. Stocke ce composable avec mem.",
    expected: "Claude crée le composable avec watchEffect et stocke",
    category: "vuejs",
    difficulty: "normal",
  },
  {
    id: "vuejs-hard-custom-composable-suspense",
    title: "Vue.js 3.5 - Composable async avec Suspense",
    description: "Créez un composable complexe avec async/await et Suspense.",
    prompt:
      "Crée un composable useAsyncData pour Vue 3.5 qui gère le chargement async, les erreurs, et fonctionne avec Suspense boundaries. Stocke ce pattern avancé avec mem.",
    expected:
      "Claude crée le composable avec gestion d'état, Suspense, et stocke",
    category: "vuejs",
    difficulty: "hard",
  },

  // ===== DEVOPS TESTS =====
  {
    id: "devops-easy-dockerfile",
    title: "DevOps - Dockerfile multi-stage optimisé",
    description: "Créez un Dockerfile multi-stage pour une app Node.js.",
    prompt:
      "Crée un Dockerfile multi-stage optimisé pour une app Node.js avec bun, cache layers, et non-root user. Stocke ce Dockerfile avec mem.",
    expected:
      "Claude crée un Dockerfile multi-stage avec best practices et stocke",
    category: "devops",
    difficulty: "easy",
  },
  {
    id: "devops-normal-github-actions-cicd",
    title: "DevOps - GitHub Actions CI/CD complet",
    description: "Créez un workflow CI/CD avec tests, build et deploy.",
    prompt:
      "Crée un workflow GitHub Actions pour une app Next.js avec lint, tests, build Docker, et deploy sur Vercel. Stocke ce workflow avec mem.",
    expected: "Claude crée le workflow .github/workflows/ci.yml et stocke",
    category: "devops",
    difficulty: "normal",
  },
  {
    id: "devops-hard-kubernetes-hpa-ingress",
    title: "DevOps - Kubernetes avec HPA et Ingress",
    description: "Déployez une app avec HPA, Ingress et secrets management.",
    prompt:
      "Crée des manifests Kubernetes pour une app avec Deployment, Service, HorizontalPodAutoscaler, Ingress NGINX, et Secret management avec external-secrets. Stocke cette configuration avec mem.",
    expected:
      "Claude fournit tous les manifests K8s et stocke la configuration",
    category: "devops",
    difficulty: "hard",
  },
];

export const categoryConfig: Record<
  TestCategory,
  {
    title: string;
    icon: typeof LightbulbIcon;
    color: string;
    borderColor: string;
  }
> = {
  basic: {
    title: "Fonctionnalités de Base",
    icon: LightbulbIcon,
    color: "text-blue-500",
    borderColor: "border-blue-500/20",
  },
  search: {
    title: "Recherche Unifiée",
    icon: SearchIcon,
    color: "text-purple-500",
    borderColor: "border-purple-500/20",
  },
  automation: {
    title: "Automation & IA",
    icon: BrainIcon,
    color: "text-pink-500",
    borderColor: "border-pink-500/20",
  },
  advanced: {
    title: "Fonctionnalités Avancées",
    icon: ZapIcon,
    color: "text-amber-500",
    borderColor: "border-amber-500/20",
  },
  tests: {
    title: "Tests & Vérification",
    icon: TestTube2Icon,
    color: "text-green-500",
    borderColor: "border-green-500/20",
  },
  nextjs: {
    title: "Next.js 16",
    icon: RocketIcon,
    color: "text-gray-800 dark:text-white",
    borderColor: "border-gray-800/20 dark:border-white/20",
  },
  react19: {
    title: "React 19",
    icon: CpuIcon,
    color: "text-cyan-500",
    borderColor: "border-cyan-500/20",
  },
  "php-symfony": {
    title: "Symfony 8",
    icon: DatabaseIcon,
    color: "text-gray-700 dark:text-gray-300",
    borderColor: "border-gray-700/20 dark:border-gray-300/20",
  },
  "php-laravel": {
    title: "Laravel 12",
    icon: BugIcon,
    color: "text-red-500",
    borderColor: "border-red-500/20",
  },
  "php-api-platform": {
    title: "API Platform",
    icon: TerminalIcon,
    color: "text-green-600",
    borderColor: "border-green-600/20",
  },
  vuejs: {
    title: "Vue.js 3.5",
    icon: CpuIcon,
    color: "text-emerald-500",
    borderColor: "border-emerald-500/20",
  },
  devops: {
    title: "DevOps & Infrastructure",
    icon: RocketIcon,
    color: "text-orange-500",
    borderColor: "border-orange-500/20",
  },
  codebase: {
    title: "Indexation Codebase",
    icon: FolderCodeIcon,
    color: "text-indigo-500",
    borderColor: "border-indigo-500/20",
  },
};
