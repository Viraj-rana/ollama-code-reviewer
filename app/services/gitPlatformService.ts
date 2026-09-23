import { ExternalMR } from "../types";

export interface GitHubRepo { owner: { login: string }; name: string; full_name: string; }
export interface GitHubPR { id: string; number: number; title: string; user?: { login: string; avatar_url: string }; created_at: string; html_url: string; head: { ref: string }; base: { ref: string }; }
export interface GitLabProject { id: string; path_with_namespace: string; }
export interface GitLabMR { id: string; iid: number; title: string; author: { username: string; avatar_url: string }; created_at: string; web_url: string; source_branch: string; target_branch: string; }

interface PlatformConfig {
  baseUrl: string;
  authHeader: Record<string, string>;
  extraHeaders?: Record<string, string>;
}const apiRequest = async <T>(url: string, options: RequestInit): Promise<T | null> => {
  try {
  const res = await fetch(url, options);
    if (res.status === 204) return {} as T;
    if (!res.ok) {
      console.warn(`[API WARN] ${res.status} ${res.statusText} for URL: ${url}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`[API ERROR] Network or parser crash for URL: ${url}`, error);
    return null;
  }
};

export const verifyGitHubToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch("https://api.github.com/user", {
      method: "HEAD", 
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    return res.ok;
  } catch { return false; }
};

export const verifyGitLabToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch("https://gitlab.com/api/v4/user", {
      method: "HEAD", 
      headers: { "PRIVATE-TOKEN": token }
    });
    return res.ok;
  } catch { return false; }
};

const fetchGitHubPRs = async (token: string): Promise<ExternalMR[]> => {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' };
  
  const repos = await apiRequest<GitHubRepo[]>(
    "https://github.com", 
    { headers }
  );
  if (!repos) return [];

  const prPromises = repos.map(async (repo) => {
    const pulls = await apiRequest<GitHubPR[]>(
      `https://api.github.com/repos/${repo.owner.login}/${repo.name}/pulls?state=open&per_page=20`, 
      { headers }
  );
    
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
      platform: 'github' as const,
      repo: repo.full_name
    })) || [];
  });

  const results = await Promise.allSettled(prPromises);
  return results
    .filter((r): r is PromiseFulfilledResult<ExternalMR[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
};

const fetchGitLabMRs = async (token: string): Promise<ExternalMR[]> => {
  const headers = { "PRIVATE-TOKEN": token };
  const projects = await apiRequest<GitLabProject[]>(
    "https://gitlab.com/api/v4/projects?membership=true&per_page=20&order_by=updated_at", 
    { headers }
  );
  if (!projects) return [];

  const mrPromises = projects.map(async (project) => {
    const mrs = await apiRequest<GitLabMR[]>(
      `https://gitlab.com/api/v4/projects/${project.id}/merge_requests?state=opened&per_page=20`, 
      { headers }
    );
    
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
      platform: 'gitlab' as const,
      repo: project.path_with_namespace
    })) || [];
  });

  const results = await Promise.allSettled(mrPromises);
  return results
    .filter((r): r is PromiseFulfilledResult<ExternalMR[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
};

export const fetchOpenMrs = async (
  githubToken: string | null, 
  gitlabToken: string | null
): Promise<ExternalMR[]> => {
  const promises: Promise<ExternalMR[]>[] = [];
  
  if (githubToken) promises.push(fetchGitHubPRs(githubToken));
  if (gitlabToken) promises.push(fetchGitLabMRs(gitlabToken));

  const results = await Promise.allSettled(promises);
  
  const allMrs = results
    .filter((r): r is PromiseFulfilledResult<ExternalMR[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  return allMrs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
};
export const fetchMergeRequestDiff = async (
  mr: ExternalMR, 
  token: string
): Promise<{ diff: string, context: string }> => {
  let diff = "";
  let context = "";

  if (mr.platform === 'github') {
    const [owner, repo] = mr.repo.split('/');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const diffRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${mr.number}`, {
        headers: { ...headers, Accept: 'application/vnd.github.v3.diff' }
      });
      if (diffRes.ok) diff = await diffRes.text();
    } catch (e) {
      console.error("[Diff Generation Error] Failed reading raw text diff from GitHub:", e);
    }

    const comments = await apiRequest<any[]>(
      `https://api.github.com/repos/${owner}/${repo}/issues/${mr.number}/comments?per_page=30`, 
      { headers: { ...headers, Accept: 'application/vnd.github.v3+json' } }
    );
    context = comments?.map((c) => `${c.user?.login || 'unknown'}: ${c.body}`).join('\n---\n') || '';

  } else if (mr.platform === 'gitlab') {
    const projectPath = encodeURIComponent(mr.repo);
    const headers = { "PRIVATE-TOKEN": token };
    
    const diffs = await apiRequest<any[]>(
      `https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${mr.number}/diffs?per_page=30`, 
      { headers }
    );
    diff = diffs?.map((d) => `--- a/${d.old_path}\n+++ b/${d.new_path}\n${d.diff}`).join('\n\n') || '';

    const notes = await apiRequest<any[]>(
      `https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${mr.number}/notes?sort=asc&per_page=50`, 
      { headers }
    );
    context = notes?.filter((n) => !n.system).map((n) => `${n.author?.username || 'unknown'}: ${n.body}`).join('\n---\n') || '';
  }

  return { diff, context };
};
