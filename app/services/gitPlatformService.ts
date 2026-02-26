
import { ExternalMR } from "../types";

export const verifyGitHubToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { 
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

export const verifyGitLabToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch("https://gitlab.com/api/v4/user", {
      headers: { "PRIVATE-TOKEN": token }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

export const fetchOpenMrs = async (githubToken: string | null, gitlabToken: string | null): Promise<ExternalMR[]> => {
  let allMrs: ExternalMR[] = [];

  // GitHub Fetch Logic: User -> Repos -> Pulls
  if (githubToken) {
    try {
      // Fetch user's repos (Limit to 20 recently updated to avoid browser rate limits)
      const reposRes = await fetch("https://api.github.com/user/repos?per_page=20&sort=updated&type=all", {
        headers: { Authorization: `token ${githubToken}` }
      });
      
      if (reposRes.ok) {
        const repos = await reposRes.json();
        
        // Parallel fetch for open PRs in each repo
        const prPromises = repos.map(async (repo: any) => {
          try {
            const pullsRes = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/pulls?state=open`, {
              headers: { Authorization: `token ${githubToken}` }
            });
            if (pullsRes.ok) {
              const pulls = await pullsRes.json();
              return pulls.map((p: any) => ({
                id: String(p.id),
                number: p.number,
                title: p.title,
                author: p.user?.login || 'unknown',
                authorAvatar: p.user?.avatar_url,
                createdAt: p.created_at,
                url: p.html_url,
                sourceBranch: p.head.ref,
                targetBranch: p.base.ref,
                platform: 'github',
                repo: repo.full_name
              }));
            }
          } catch (e) {
            console.warn(`Failed to fetch PRs for ${repo.full_name}`, e);
          }
          return [];
        });

        const results = await Promise.all(prPromises);
        allMrs = [...allMrs, ...results.flat()];
      }
    } catch (e) {
      console.error("GitHub Fetch Error", e);
    }
  }

  // GitLab Fetch Logic: Projects -> Merge Requests
  if (gitlabToken) {
    try {
      // Fetch projects where user is a member
      const projectsRes = await fetch("https://gitlab.com/api/v4/projects?membership=true&per_page=20&order_by=updated_at", {
        headers: { "PRIVATE-TOKEN": gitlabToken }
      });

      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        
        const mrPromises = projects.map(async (project: any) => {
            try {
                const mrsRes = await fetch(`https://gitlab.com/api/v4/projects/${project.id}/merge_requests?state=opened`, {
                    headers: { "PRIVATE-TOKEN": gitlabToken }
                });
                if (mrsRes.ok) {
                    const mrs = await mrsRes.json();
                    return mrs.map((m: any) => ({
                        id: String(m.id),
                        number: m.iid,
                        title: m.title,
                        author: m.author.username,
                        authorAvatar: m.author.avatar_url,
                        createdAt: m.created_at,
                        url: m.web_url,
                        sourceBranch: m.source_branch,
                        targetBranch: m.target_branch,
                        platform: 'gitlab',
                        repo: project.path_with_namespace
                    }));
                }
            } catch (e) {
                console.warn(`Failed to fetch MRs for ${project.path_with_namespace}`, e);
            }
            return [];
        });

        const results = await Promise.all(mrPromises);
        allMrs = [...allMrs, ...results.flat()];
      }
    } catch (e) {
       console.error("GitLab Fetch Error", e);
    }
  }
  
  return allMrs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const fetchMergeRequestDiff = async (mr: ExternalMR, token: string): Promise<{ diff: string, context: string }> => {
    let diff = "";
    let context = "";

    if (mr.platform === 'github') {
        const [owner, repo] = mr.repo.split('/');
        
        // Fetch Diff
        const diffRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${mr.number}`, {
            headers: { 
                Authorization: `token ${token}`, 
                Accept: 'application/vnd.github.v3.diff' 
            }
        });
        diff = await diffRes.text();

        // Fetch Comments for context
        const commentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${mr.number}/comments`, {
            headers: { 
                Authorization: `token ${token}`, 
                Accept: 'application/vnd.github.v3+json' 
            }
        });
        const comments = await commentsRes.json();
        context = Array.isArray(comments) ? comments.map((c: any) => `${c.user.login}: ${c.body}`).join('\n---\n') : '';

    } else if (mr.platform === 'gitlab') {
        const match = mr.url.match(/gitlab\.com\/(.+?)\/-\/merge_requests\/(\d+)/);
        if (!match) throw new Error("Could not parse GitLab project ID from URL");
        
        const projectPath = encodeURIComponent(match[1]);
        
        // Fetch Diff
        const resDiff = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${mr.number}/diffs`, {
            headers: { "PRIVATE-TOKEN": token }
        });
        const diffs = await resDiff.json();
        diff = diffs.map((d: any) => `--- a/${d.old_path}\n+++ b/${d.new_path}\n${d.diff}`).join('\n\n');

        // Fetch Notes
        const notesRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${mr.number}/notes?sort=asc`, {
            headers: { "PRIVATE-TOKEN": token }
        });
        if (notesRes.ok) {
            const notes = await notesRes.json();
            context = Array.isArray(notes) ? notes.filter((n: any) => !n.system).map((n: any) => `${n.author.username}: ${n.body}`).join('\n---\n') : '';
        }
    }

    return { diff, context };
}
