import { ExternalMR } from "../types";

interface GitHubRepo { owner: { login: string }; name: string; full_name: string; }
interface GitHubPR { id: string; number: number; title: string; user?: { login: string; avatar_url: string }; created_at: string; html_url: string; head: { ref: string }; base: { ref: string }; }
interface GitLabProject { id: string; path_with_namespace: string; }
interface GitLabMR { id: string; iid: number; title: string; author: { username: string; avatar_url: string }; created_at: string; web_url: string; source_branch: string; target_branch: string; }

const apiRequest = async <T>(url: string, options: RequestInit): Promise<T | null> => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

export const verifyGitHubToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    return res.ok;
  } catch { return false; }
};

export const verifyGitLabToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch("https://gitlab.com/api/v4/user", {
      headers: { "PRIVATE-TOKEN": token }
    });
    return res.ok;
  } catch { return false; }
};

export const fetchOpenMrs = async (githubToken: string | null, gitlabToken: string | null): Promise<ExternalMR[]> => {
  let allMrs: ExternalMR[] = [];

  if (githubToken) {
    const repos = await apiRequest<GitHubRepo[]>("https://api.github.com/user/repos?per_page=20&sort=updated&type=all", {
      headers: { Authorization: `token ${githubToken}` }
    });

    if (repos) {
      const prPromises = repos.map(async (repo) => {
        const pulls = await apiRequest<GitHubPR[]>(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/pulls?state=open`, {
          headers: { Authorization: `token ${githubToken}` }
        });
        return pulls?.map((p) => ({
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
        })) || [];
      });

      const results = await Promise.allSettled(prPromises);
      allMrs.push(...results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<ExternalMR[]>).value).flat());
    }
  }

  if (gitlabToken) {
    const projects = await apiRequest<GitLabProject[]>("https://gitlab.com/api/v4/projects?membership=true&per_page=20&order_by=updated_at", {
      headers: { "PRIVATE-TOKEN": gitlabToken }
    });

    if (projects) {
      const mrPromises = projects.map(async (project) => {
        const mrs = await apiRequest<GitLabMR[]>(`https://gitlab.com/api/v4/projects/${project.id}/merge_requests?state=opened`, {
          headers: { "PRIVATE-TOKEN": gitlabToken }
        });
        return mrs?.map((m) => ({
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
        })) || [];
      });

      const results = await Promise.allSettled(mrPromises);
      allMrs.push(...results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<ExternalMR[]>).value).flat());
    }
  }

  return allMrs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const fetchMergeRequestDiff = async (mr: ExternalMR, token: string): Promise<{ diff: string, context: string }> => {
  let diff = "";
  let context = "";

  if (mr.platform === 'github') {
    const [owner, repo] = mr.repo.split('/');
    
    const diffRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${mr.number}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3.diff' }
    });
    diff = await diffRes.text();

    const comments = await apiRequest<any[]>(`https://api.github.com/repos/${owner}/${repo}/issues/${mr.number}/comments`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    context = comments?.map((c) => `${c.user.login}: ${c.body}`).join('\n---\n') || '';

  } else if (mr.platform === 'gitlab') {
    const projectPath = encodeURIComponent(mr.repo);
    
    const diffs = await apiRequest<any[]>(`https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${mr.number}/diffs`, {
      headers: { "PRIVATE-TOKEN": token }
    });
    diff = diffs?.map((d) => `--- a/${d.old_path}\n+++ b/${d.new_path}\n${d.diff}`).join('\n\n') || '';

    const notes = await apiRequest<any[]>(`https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${mr.number}/notes?sort=asc`, {
      headers: { "PRIVATE-TOKEN": token }
    });
    context = notes?.filter((n) => !n.system).map((n) => `${n.author.username}: ${n.body}`).join('\n---\n') || '';
  }

  return { diff, context };
}
