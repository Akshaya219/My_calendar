-- ============================================================
-- 007_syllabus_system.sql
-- Unified Syllabus System and Mock Test Tracker
-- ============================================================

-- 1. SYLLABUS TABLES (Shared, Seeded Once)
-- ============================================================

DROP TABLE IF EXISTS dsa_subtopics CASCADE;
DROP TABLE IF EXISTS dsa_topics CASCADE;
DROP TABLE IF EXISTS gate_subtopics CASCADE;
DROP TABLE IF EXISTS gate_subjects CASCADE;

-- DSA Topics
CREATE TABLE dsa_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index INTEGER NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL  -- 'basic' | 'advanced' | 'algorithms'
);

-- DSA Subtopics
CREATE TABLE dsa_subtopics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id    UUID NOT NULL REFERENCES dsa_topics(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  name        TEXT NOT NULL,
  is_custom   BOOLEAN DEFAULT FALSE
);

-- GATE Subjects
CREATE TABLE gate_subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index INTEGER NOT NULL,
  name        TEXT NOT NULL,
  stream      TEXT NOT NULL  -- 'DA' | 'CS' | 'BOTH'
);

-- GATE Subtopics
CREATE TABLE gate_subtopics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID NOT NULL REFERENCES gate_subjects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  name        TEXT NOT NULL,
  is_custom   BOOLEAN DEFAULT FALSE
);


-- RLS: Public read, No client write
ALTER TABLE dsa_topics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsa_subtopics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_subjects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_subtopics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read dsa_topics"     ON dsa_topics     FOR SELECT USING (true);
CREATE POLICY "Public read dsa_subtopics"  ON dsa_subtopics  FOR SELECT USING (true);
CREATE POLICY "Public read gate_subjects"  ON gate_subjects   FOR SELECT USING (true);
CREATE POLICY "Public read gate_subtopics" ON gate_subtopics  FOR SELECT USING (true);


DROP TABLE IF EXISTS user_syllabus_progress CASCADE;
DROP TABLE IF EXISTS gate_mock_tests CASCADE;

-- 2. USER PROGRESS (Private per User)
-- ============================================================

CREATE TABLE user_syllabus_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,


  dsa_subtopic_id  UUID REFERENCES dsa_subtopics(id)  ON DELETE CASCADE,
  gate_subtopic_id UUID REFERENCES gate_subtopics(id) ON DELETE CASCADE,

  is_completed    BOOLEAN DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  confidence      SMALLINT DEFAULT 0 CHECK (confidence BETWEEN 0 AND 5),
  target_date     DATE,
  notes           TEXT,

  next_revision_date  DATE,
  revision_count      SMALLINT DEFAULT 0,
  revision_dates      JSONB DEFAULT '[]',

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, dsa_subtopic_id),
  UNIQUE (user_id, gate_subtopic_id),

  CONSTRAINT one_subtopic_type CHECK (
    (dsa_subtopic_id IS NOT NULL AND gate_subtopic_id IS NULL) OR
    (dsa_subtopic_id IS NULL AND gate_subtopic_id IS NOT NULL)
  )
);

ALTER TABLE user_syllabus_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
  ON user_syllabus_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_progress_modtime
  BEFORE UPDATE ON user_syllabus_progress
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- 3. GATE MOCK TESTS (Private per User)
-- ============================================================

CREATE TABLE gate_mock_tests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_name   TEXT NOT NULL,
  test_date   DATE NOT NULL,
  score       NUMERIC(5,2),
  total_marks NUMERIC(5,2) DEFAULT 100,
  stream      TEXT DEFAULT 'DA',
  weak_areas  TEXT[],
  remarks     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gate_mock_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tests"
  ON gate_mock_tests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 4. SEED DATA: DSA SYLLABUS
-- ============================================================

INSERT INTO dsa_topics (order_index, name, category) VALUES
(1,  'Arrays',                'basic'),
(2,  'Strings',               'basic'),
(3,  'Linked Lists',          'basic'),
(4,  'Stacks',                'basic'),
(5,  'Queues',                'basic'),
(6,  'Trees',                 'advanced'),
(7,  'Binary Search Trees',   'advanced'),
(8,  'Heaps',                 'advanced'),
(9,  'Graphs',                'advanced'),
(10, 'Trie',                  'advanced'),
(11, 'Segment Tree & BIT',    'advanced'),
(12, 'Sorting',               'algorithms'),
(13, 'Searching',             'algorithms'),
(14, 'Greedy',                'algorithms'),
(15, 'Dynamic Programming',   'algorithms'),
(16, 'Graph Algorithms',      'algorithms'),
(17, 'Backtracking',          'algorithms'),
(18, 'Divide & Conquer',      'algorithms');

-- Subtopics (Arrays)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Arrays')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Traversal & basic operations'),
((SELECT id FROM t), 2, 'Two pointer technique'),
((SELECT id FROM t), 3, 'Sliding window'),
((SELECT id FROM t), 4, 'Prefix sums & difference arrays'),
((SELECT id FROM t), 5, 'Kadane''s algorithm'),
((SELECT id FROM t), 6, 'Matrix manipulation'),
((SELECT id FROM t), 7, 'Sorting-based problems');

-- Subtopics (Strings)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Strings')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'String basics & manipulation'),
((SELECT id FROM t), 2, 'Pattern matching (KMP, Rabin-Karp)'),
((SELECT id FROM t), 3, 'Anagram & palindrome problems'),
((SELECT id FROM t), 4, 'String hashing'),
((SELECT id FROM t), 5, 'Z-algorithm');

-- Subtopics (Linked Lists)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Linked Lists')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Singly linked list operations'),
((SELECT id FROM t), 2, 'Doubly & circular linked lists'),
((SELECT id FROM t), 3, 'Reversal techniques'),
((SELECT id FROM t), 4, 'Cycle detection (Floyd''s)'),
((SELECT id FROM t), 5, 'Merge & sort linked lists');

-- Subtopics (Stacks)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Stacks')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Stack using array & linked list'),
((SELECT id FROM t), 2, 'Monotonic stack'),
((SELECT id FROM t), 3, 'Balanced parentheses'),
((SELECT id FROM t), 4, 'Next greater/smaller element'),
((SELECT id FROM t), 5, 'Expression evaluation (infix/postfix)');

-- Subtopics (Queues)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Queues')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Queue using array & linked list'),
((SELECT id FROM t), 2, 'Circular queue'),
((SELECT id FROM t), 3, 'Deque (double-ended queue)'),
((SELECT id FROM t), 4, 'Priority queue (heap-based)'),
((SELECT id FROM t), 5, 'Sliding window maximum');

-- Subtopics (Trees)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Trees')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Tree traversals (inorder, preorder, postorder, level-order)'),
((SELECT id FROM t), 2, 'Height, depth, diameter'),
((SELECT id FROM t), 3, 'Lowest common ancestor'),
((SELECT id FROM t), 4, 'Path sum problems'),
((SELECT id FROM t), 5, 'Serialize & deserialize'),
((SELECT id FROM t), 6, 'N-ary trees');

-- Subtopics (BST)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Binary Search Trees')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Insert, delete, search'),
((SELECT id FROM t), 2, 'Inorder successor/predecessor'),
((SELECT id FROM t), 3, 'AVL & Red-Black trees (concepts)'),
((SELECT id FROM t), 4, 'Kth smallest/largest'),
((SELECT id FROM t), 5, 'Validate BST');

-- Subtopics (Heaps)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Heaps')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Min heap & max heap'),
((SELECT id FROM t), 2, 'Heapify & heap sort'),
((SELECT id FROM t), 3, 'Kth largest element'),
((SELECT id FROM t), 4, 'Merge k sorted arrays'),
((SELECT id FROM t), 5, 'Median from data stream');

-- Subtopics (Graphs)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Graphs')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Representation (adjacency list/matrix)'),
((SELECT id FROM t), 2, 'BFS & DFS'),
((SELECT id FROM t), 3, 'Topological sort'),
((SELECT id FROM t), 4, 'Cycle detection (directed & undirected)'),
((SELECT id FROM t), 5, 'Connected components'),
((SELECT id FROM t), 6, 'Bipartite check');

-- Subtopics (Trie)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Trie')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Trie insert & search'),
((SELECT id FROM t), 2, 'Autocomplete / word search'),
((SELECT id FROM t), 3, 'XOR problems using trie');

-- Subtopics (Segment Tree & BIT)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Segment Tree & BIT')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Range sum / min / max queries'),
((SELECT id FROM t), 2, 'Lazy propagation'),
((SELECT id FROM t), 3, 'Binary Indexed Tree (Fenwick)'),
((SELECT id FROM t), 4, 'Point & range updates');

-- Subtopics (Sorting)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Sorting')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Bubble, selection, insertion sort'),
((SELECT id FROM t), 2, 'Merge sort'),
((SELECT id FROM t), 3, 'Quick sort'),
((SELECT id FROM t), 4, 'Counting, radix, bucket sort'),
((SELECT id FROM t), 5, 'Custom comparators');

-- Subtopics (Searching)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Searching')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Binary search on sorted array'),
((SELECT id FROM t), 2, 'Binary search on answer'),
((SELECT id FROM t), 3, 'Search in rotated array'),
((SELECT id FROM t), 4, 'Lower & upper bound');

-- Subtopics (Greedy)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Greedy')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Activity selection'),
((SELECT id FROM t), 2, 'Fractional knapsack'),
((SELECT id FROM t), 3, 'Job scheduling'),
((SELECT id FROM t), 4, 'Huffman encoding'),
((SELECT id FROM t), 5, 'Interval problems');

-- Subtopics (DP)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Dynamic Programming')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Fibonacci & memoization'),
((SELECT id FROM t), 2, '0/1 Knapsack'),
((SELECT id FROM t), 3, 'Longest Common Subsequence'),
((SELECT id FROM t), 4, 'Longest Increasing Subsequence'),
((SELECT id FROM t), 5, 'Matrix chain multiplication'),
((SELECT id FROM t), 6, 'Coin change & subset sum'),
((SELECT id FROM t), 7, 'DP on trees'),
((SELECT id FROM t), 8, 'DP on grids'),
((SELECT id FROM t), 9, 'Bitmask DP');

-- Subtopics (Graph Algorithms)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Graph Algorithms')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Dijkstra''s shortest path'),
((SELECT id FROM t), 2, 'Bellman-Ford'),
((SELECT id FROM t), 3, 'Floyd-Warshall (all-pairs)'),
((SELECT id FROM t), 4, 'Kruskal''s MST'),
((SELECT id FROM t), 5, 'Prim''s MST'),
((SELECT id FROM t), 6, 'Union-Find (DSU)'),
((SELECT id FROM t), 7, 'Bridges & articulation points'),
((SELECT id FROM t), 8, 'Strongly connected components (Tarjan/Kosaraju)');

-- Subtopics (Backtracking)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Backtracking')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'N-Queens'),
((SELECT id FROM t), 2, 'Sudoku solver'),
((SELECT id FROM t), 3, 'Subsets & permutations'),
((SELECT id FROM t), 4, 'Word search in grid'),
((SELECT id FROM t), 5, 'Rat in a maze');

-- Subtopics (Divide & Conquer)
WITH t AS (SELECT id FROM dsa_topics WHERE name = 'Divide & Conquer')
INSERT INTO dsa_subtopics (topic_id, order_index, name) VALUES
((SELECT id FROM t), 1, 'Merge sort-based problems'),
((SELECT id FROM t), 2, 'Binary search variants'),
((SELECT id FROM t), 3, 'Matrix exponentiation'),
((SELECT id FROM t), 4, 'Closest pair of points');


-- 5. SEED DATA: GATE SYLLABUS
-- ============================================================

INSERT INTO gate_subjects (order_index, name, stream) VALUES
(1,  'Probability & Statistics',                'BOTH'),
(2,  'Linear Algebra',                          'BOTH'),
(3,  'Calculus & Optimization',                 'BOTH'),
(4,  'Discrete Mathematics',                    'CS'),
(5,  'Programming & Python',                    'DA'),
(6,  'C Programming',                           'CS'),
(7,  'Data Structures',                         'BOTH'),
(8,  'Algorithms',                              'BOTH'),
(9,  'Artificial Intelligence',                 'DA'),
(10, 'Machine Learning',                        'DA'),
(11, 'Database & Data Warehousing',             'BOTH'),
(12, 'Digital Logic & Computer Organization',   'CS'),
(13, 'Operating Systems',                       'CS'),
(14, 'Theory of Computation',                   'CS'),
(15, 'Compiler Design',                         'CS'),
(16, 'Computer Networks',                       'CS'),
(17, 'General Aptitude',                        'DA');

-- Probability & Statistics
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Probability & Statistics')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Counting: permutations & combinations'),
((SELECT id FROM s), 2,  'Probability axioms, sample space, events'),
((SELECT id FROM s), 3,  'Independent & mutually exclusive events'),
((SELECT id FROM s), 4,  'Conditional, marginal & joint probability'),
((SELECT id FROM s), 5,  'Bayes'' Theorem'),
((SELECT id FROM s), 6,  'Random variables: discrete & continuous'),
((SELECT id FROM s), 7,  'PMF, PDF, CDF, conditional PDF'),
((SELECT id FROM s), 8,  'Distributions: Uniform, Bernoulli, Binomial, Poisson'),
((SELECT id FROM s), 9,  'Distributions: Normal, Exponential, t, Chi-squared'),
((SELECT id FROM s), 10, 'Descriptive statistics: mean, median, mode, variance'),
((SELECT id FROM s), 11, 'Correlation & covariance'),
((SELECT id FROM s), 12, 'Central Limit Theorem'),
((SELECT id FROM s), 13, 'Conditional expectation & variance'),
((SELECT id FROM s), 14, 'Confidence intervals'),
((SELECT id FROM s), 15, 'Hypothesis testing: z-test, t-test, chi-squared test');

-- Linear Algebra
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Linear Algebra')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Vector spaces & subspaces'),
((SELECT id FROM s), 2,  'Linear dependence & independence'),
((SELECT id FROM s), 3,  'Matrix operations & types (projection, orthogonal, idempotent)'),
((SELECT id FROM s), 4,  'Quadratic forms & partitioned matrices'),
((SELECT id FROM s), 5,  'Systems of equations & Gaussian elimination'),
((SELECT id FROM s), 6,  'Eigenvalues & eigenvectors'),
((SELECT id FROM s), 7,  'Determinant, rank & nullity'),
((SELECT id FROM s), 8,  'LU decomposition'),
((SELECT id FROM s), 9,  'SVD (Singular Value Decomposition)');

-- Calculus & Optimization
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Calculus & Optimization')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Functions: limits, continuity, differentiability'),
((SELECT id FROM s), 2,  'Taylor series'),
((SELECT id FROM s), 3,  'Maxima & minima, single-variable optimization'),
((SELECT id FROM s), 4,  'Integration & Mean Value Theorem');

-- Discrete Mathematics
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Discrete Mathematics')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Propositional logic'),
((SELECT id FROM s), 2,  'First-order/predicate logic'),
((SELECT id FROM s), 3,  'Sets, relations & functions'),
((SELECT id FROM s), 4,  'Partial orders & lattices'),
((SELECT id FROM s), 5,  'Monoids & groups'),
((SELECT id FROM s), 6,  'Graph theory: connectivity, matching, coloring'),
((SELECT id FROM s), 7,  'Combinatorics: recurrence relations'),
((SELECT id FROM s), 8,  'Generating functions');

-- Programming & Python
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Programming & Python')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Variables, types, and operators'),
((SELECT id FROM s), 2,  'Control structures (loops, conditionals)'),
((SELECT id FROM s), 3,  'Functions, scope, and recursion'),
((SELECT id FROM s), 4,  'Lists, tuples, dictionaries, and strings'),
((SELECT id FROM s), 5,  'Basic file I/O and exception handling');

-- C Programming
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'C Programming')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Data types, operators, and expressions'),
((SELECT id FROM s), 2,  'Control flow (loops, switch-case)'),
((SELECT id FROM s), 3,  'Functions, parameter passing, and recursion'),
((SELECT id FROM s), 4,  'Arrays, pointers, and string manipulation'),
((SELECT id FROM s), 5,  'Structures, unions, and dynamic memory allocation');

-- Data Structures
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Data Structures')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Arrays, stacks, queues, linked lists'),
((SELECT id FROM s), 2,  'Trees & binary search trees'),
((SELECT id FROM s), 3,  'Heaps'),
((SELECT id FROM s), 4,  'Hash tables & hashing'),
((SELECT id FROM s), 5,  'Graphs');

-- Algorithms
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Algorithms')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Searching: linear & binary'),
((SELECT id FROM s), 2,  'Sorting: selection, bubble, insertion, merge, quick'),
((SELECT id FROM s), 3,  'Divide & conquer'),
((SELECT id FROM s), 4,  'Greedy algorithms'),
((SELECT id FROM s), 5,  'Dynamic programming'),
((SELECT id FROM s), 6,  'Graph: DFS, BFS traversals'),
((SELECT id FROM s), 7,  'Shortest paths: Dijkstra, Bellman-Ford'),
((SELECT id FROM s), 8,  'MST: Kruskal & Prim'),
((SELECT id FROM s), 9,  'Time & space complexity (asymptotic worst-case)');

-- Artificial Intelligence
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Artificial Intelligence')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Uninformed search algorithms'),
((SELECT id FROM s), 2,  'Informed search algorithms (A*, heuristics)'),
((SELECT id FROM s), 3,  'Adversarial search (minimax, alpha-beta)'),
((SELECT id FROM s), 4,  'Propositional & predicate logic'),
((SELECT id FROM s), 5,  'Conditional independence'),
((SELECT id FROM s), 6,  'Exact inference: variable elimination'),
((SELECT id FROM s), 7,  'Approximate inference: sampling methods');

-- Machine Learning
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Machine Learning')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Simple & multiple linear regression'),
((SELECT id FROM s), 2,  'Ridge regression & regularization'),
((SELECT id FROM s), 3,  'Logistic regression'),
((SELECT id FROM s), 4,  'kNN classifier'),
((SELECT id FROM s), 5,  'Naïve Bayes'),
((SELECT id FROM s), 6,  'Linear Discriminant Analysis (LDA)'),
((SELECT id FROM s), 7,  'Support Vector Machines (SVM)'),
((SELECT id FROM s), 8,  'Decision trees'),
((SELECT id FROM s), 9,  'Neural networks (MLP, feedforward)'),
((SELECT id FROM s), 10, 'Bias–variance tradeoff'),
((SELECT id FROM s), 11, 'Cross-validation: LOOCV & k-fold'),
((SELECT id FROM s), 12, 'Clustering: k-means & k-medoid'),
((SELECT id FROM s), 13, 'Hierarchical clustering: single & complete linkage'),
((SELECT id FROM s), 14, 'Dimensionality reduction & PCA');

-- Database & Data Warehousing
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Database & Data Warehousing')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'ER model & relational model'),
((SELECT id FROM s), 2,  'Relational algebra & tuple calculus'),
((SELECT id FROM s), 3,  'SQL & integrity constraints'),
((SELECT id FROM s), 4,  'Normal forms (1NF–BCNF)'),
((SELECT id FROM s), 5,  'Indexing: B-trees & B+ trees'),
((SELECT id FROM s), 6,  'Data transformation: normalization, discretization, sampling'),
((SELECT id FROM s), 7,  'Multidimensional modeling'),
((SELECT id FROM s), 8,  'Star & snowflake schemas'),
((SELECT id FROM s), 9,  'Concept hierarchies & measures'),
((SELECT id FROM s), 10, 'Transactions & concurrency control');

-- Digital Logic & Computer Organization
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Digital Logic & Computer Organization')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Boolean algebra & circuit minimization'),
((SELECT id FROM s), 2,  'Combinational & sequential circuits'),
((SELECT id FROM s), 3,  'Number systems & representations'),
((SELECT id FROM s), 4,  'Fixed & floating point arithmetic'),
((SELECT id FROM s), 5,  'Machine instructions & addressing modes'),
((SELECT id FROM s), 6,  'ALU, datapath & control unit'),
((SELECT id FROM s), 7,  'Instruction pipelining & hazards'),
((SELECT id FROM s), 8,  'Memory hierarchy: cache, main & secondary storage'),
((SELECT id FROM s), 9,  'I/O interface: interrupts & DMA');

-- Operating Systems
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Operating Systems')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'System calls, processes & threads'),
((SELECT id FROM s), 2,  'Inter-process communication'),
((SELECT id FROM s), 3,  'Concurrency, synchronization & deadlocks'),
((SELECT id FROM s), 4,  'CPU scheduling algorithms'),
((SELECT id FROM s), 5,  'I/O scheduling'),
((SELECT id FROM s), 6,  'Memory management & virtual memory'),
((SELECT id FROM s), 7,  'File systems');

-- Theory of Computation
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Theory of Computation')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Regular expressions & finite automata'),
((SELECT id FROM s), 2,  'Context-free grammars & pushdown automata'),
((SELECT id FROM s), 3,  'Regular & context-free languages'),
((SELECT id FROM s), 4,  'Pumping Lemma'),
((SELECT id FROM s), 5,  'Turing machines'),
((SELECT id FROM s), 6,  'Decidability & undecidability');

-- Compiler Design
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Compiler Design')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Lexical analysis'),
((SELECT id FROM s), 2,  'Parsing (top-down, bottom-up)'),
((SELECT id FROM s), 3,  'Syntax-directed translation'),
((SELECT id FROM s), 4,  'Runtime environments'),
((SELECT id FROM s), 5,  'Intermediate code generation'),
((SELECT id FROM s), 6,  'Data flow analysis: constant propagation, liveness, CSE');

-- Computer Networks
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'Computer Networks')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'OSI & TCP/IP layering models'),
((SELECT id FROM s), 2,  'Packet, circuit & virtual-circuit switching'),
((SELECT id FROM s), 3,  'Data link: framing, error detection, MAC, Ethernet'),
((SELECT id FROM s), 4,  'Routing: shortest path, flooding, distance vector, link state'),
((SELECT id FROM s), 5,  'IP: fragmentation, IPv4, CIDR, ARP, DHCP, ICMP, NAT'),
((SELECT id FROM s), 6,  'Transport: flow & congestion control, UDP, TCP, sockets'),
((SELECT id FROM s), 7,  'Application: DNS, SMTP, HTTP, FTP, Email');

-- General Aptitude
WITH s AS (SELECT id FROM gate_subjects WHERE name = 'General Aptitude')
INSERT INTO gate_subtopics (subject_id, order_index, name) VALUES
((SELECT id FROM s), 1,  'Verbal: grammar, vocabulary, comprehension'),
((SELECT id FROM s), 2,  'Quantitative: data interpretation, computation, estimation'),
((SELECT id FROM s), 3,  'Quantitative: geometry & statistics'),
((SELECT id FROM s), 4,  'Analytical: logic, deduction, induction, analogy'),
((SELECT id FROM s), 5,  'Spatial: 2D/3D patterns, transformations, paper folding');
