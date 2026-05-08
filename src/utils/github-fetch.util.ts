import { HttpException } from "@exceptions/HttpException";

export interface GitHubRepoContents {
  owner: string;
  repo: string;
  readmeContent: string | null;
  fileTree: string[]; // relative paths, top 50
  defaultBranch: string;
}

export const parseGitHubUrl = (
  url: string,
): { owner: string; repo: string } => {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/\s#?]+?)(?:\.git)?(?:\/.*)?$/,
  );
  if (!match) {
    throw new HttpException(400, `Invalid GitHub URL: ${url}`);
  }
  return { owner: match[1], repo: match[2] };
};

export const fetchGitHubRepoContents = async (
  repoUrl: string,
): Promise<GitHubRepoContents> => {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  const metaResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ElCarreira-Evaluation-Service",
      },
    },
  );

  if (metaResponse.status === 404) {
    throw new HttpException(
      404,
      `GitHub repo not found: ${owner}/${repo}. Make sure it's public.`,
    );
  }
  if (!metaResponse.ok) {
    throw new HttpException(
      502,
      `GitHub API error fetching repo metadata: ${metaResponse.status}`,
    );
  }

  const meta = (await metaResponse.json()) as { default_branch: string };
  const defaultBranch = meta.default_branch ?? "main";

  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ElCarreira-Evaluation-Service",
      },
    },
  );

  let fileTree: string[] = [];
  if (treeResponse.ok) {
    const treeData = (await treeResponse.json()) as {
      tree: { path: string; type: string }[];
    };
    fileTree = treeData.tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path)
      .slice(0, 50); // cap at 50 paths for prompt size
  }

  let readmeContent: string | null = null;
  for (const readmeName of [
    "README.md",
    "readme.md",
    "README.MD",
    "Readme.md",
  ]) {
    const readmeResponse = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${readmeName}`,
    );
    if (readmeResponse.ok) {
      const text = await readmeResponse.text();
      // Cap README at 3000 chars to avoid prompt bloat
      readmeContent = text.slice(0, 3000);
      break;
    }
  }

  return { owner, repo, readmeContent, fileTree, defaultBranch };
};
