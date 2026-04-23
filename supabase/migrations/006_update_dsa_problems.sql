-- Update platform check constraint to support all platforms used in UI
ALTER TABLE dsa_problems DROP CONSTRAINT IF EXISTS dsa_problems_platform_check;
ALTER TABLE dsa_problems ADD CONSTRAINT dsa_problems_platform_check CHECK (platform IN ('LeetCode', 'CodeChef', 'GFG', 'HackerRank', 'Codeforces', 'leetcode', 'codechef'));

-- Update difficulty check constraint to support title-case used in UI
ALTER TABLE dsa_problems DROP CONSTRAINT IF EXISTS dsa_problems_difficulty_check;
ALTER TABLE dsa_problems ADD CONSTRAINT dsa_problems_difficulty_check CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'easy', 'medium', 'hard'));
