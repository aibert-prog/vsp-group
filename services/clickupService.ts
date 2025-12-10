import { ClickUpTask, ProjectData, ClickUpSpace, ClickUpComment } from '../types';

/**
 * NOTE: In a production environment, this service would live on a backend server
 * to keep the API Token secure. For this demo, it runs in the client.
 */

// We use a CORS proxy here because browsers block direct requests to the ClickUp API (CORS).
// In a real production app, you would call your own backend, which then calls ClickUp.
const API_BASE = 'https://corsproxy.io/?https://api.clickup.com/api/v2';

// Using the provided API key as default for the demo environment
const API_TOKEN = process.env.CLICKUP_API_TOKEN || 'pk_276862653_MSJ6SPAM8W2KTIEP3ZP4FELNSNBX0CS8';
const TEAM_ID = process.env.CLICKUP_TEAM_ID || '9013447029';

// Headers for authentication
const getHeaders = () => ({
    'Authorization': API_TOKEN,
    'Content-Type': 'application/json'
});

/**
 * Robust fetch helper with exponential backoff for retrying transient errors (5xx, 429).
 */
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, baseDelay = 1000): Promise<Response> => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            
            // Success
            if (response.ok) {
                return response;
            }

            // Specific check for Proxy/Gateway errors (502, 503, 504) which often return HTML bodies
            // or 429 Rate Limiting
            if (response.status === 429 || response.status >= 500) {
                 // Throw so we catch and retry
                 throw new Error(`Server/Proxy Error: ${response.status}`);
            }

            // Client errors that shouldn't be retried (400, 401, 403, 404)
            return response;
            
        } catch (err: any) {
            lastError = err;
            const isLastAttempt = i === retries - 1;
            
            if (!isLastAttempt) {
                // Exponential backoff with jitter
                const backoff = baseDelay * Math.pow(1.5, i); 
                const jitter = Math.random() * 500;
                const delay = backoff + jitter;
                
                // If it's a network error (failed to fetch), likely CORS proxy overload
                const msg = err.message || '';
                if (msg.includes('Failed to fetch') || msg.includes('502') || msg.includes('504')) {
                    // console.warn(`Network/Proxy unstable. Retrying in ${Math.round(delay)}ms...`);
                } else {
                    // console.warn(`Fetch attempt ${i + 1}/${retries} failed for ${url} (${msg}). Retrying in ${Math.round(delay)}ms...`);
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError || new Error(`Failed to fetch after ${retries} attempts`);
};

export const fetchSpaces = async (): Promise<ClickUpSpace[]> => {
    if (!API_TOKEN) {
        throw new Error("Missing CLICKUP_API_TOKEN environment variable");
    }

    const url = `${API_BASE}/team/${TEAM_ID}/space?archived=false`;

    try {
        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: getHeaders()
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`ClickUp API Error (Spaces): ${response.status} ${err}`);
        }

        const data = await response.json();
        return Array.isArray(data.spaces) ? data.spaces : [];
    } catch (error) {
        console.error("Failed to fetch spaces", error);
        throw error;
    }
};

export const fetchTeamTasks = async (spaceId?: string): Promise<ClickUpTask[]> => {
    if (!API_TOKEN) {
        throw new Error("Missing CLICKUP_API_TOKEN environment variable");
    }

    let allTasks: ClickUpTask[] = [];
    let page = 0;
    let hasMore = true;

    // Safety limit increased to 50 (5000 tasks)
    const MAX_PAGES = 50; 

    try {
        while (hasMore && page < MAX_PAGES) {
            let url = `${API_BASE}/team/${TEAM_ID}/task?include_closed=true&subtasks=true&page=${page}`;
            
            if (spaceId) {
                url += `&space_ids[]=${spaceId}`;
            }

            try {
                // Use retry wrapper
                const response = await fetchWithRetry(url, {
                    method: 'GET',
                    headers: getHeaders()
                }, 4, 1000); // reduced retry delay

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`ClickUp API Error (Tasks page ${page}): ${response.status} ${err}`);
                }

                // Check for Cloudflare HTML error response that might slip through with 200 OK sometimes
                // We do a clone() just in case we need to read body twice (though response.json() consumes it)
                const clone = response.clone();
                try {
                     const data = await response.json();
                     if (Array.isArray(data.tasks)) {
                        allTasks = [...allTasks, ...data.tasks];
                        // ClickUp returns 100 tasks per page max. If we get fewer, we're done.
                        if (data.tasks.length < 100) {
                            hasMore = false;
                        } else {
                            page++;
                            // Removed artificial delay to speed up loading
                        }
                    } else {
                        hasMore = false;
                    }
                } catch (jsonErr) {
                    // Check if it was HTML (proxy error)
                    const text = await clone.text();
                    if (text.includes("<!DOCTYPE html>")) {
                        throw new Error("Received HTML (502/Proxy Error) instead of JSON");
                    }
                    throw jsonErr;
                }
            } catch (pageError) {
                console.error(`Error fetching page ${page} of tasks:`, pageError);
                
                // Graceful Degradation:
                // If we have already gathered tasks, we return what we have instead of crashing.
                if (allTasks.length > 0) {
                    console.warn(`Stopping task fetch at page ${page} due to error. Returning ${allTasks.length} tasks.`);
                    hasMore = false; // Stop loop
                } else {
                    throw pageError;
                }
            }
        }
        
        return allTasks;
    } catch (error) {
        console.error("Failed to fetch tasks", error);
        throw error;
    }
};

/**
 * Fetch comments for a specific task.
 */
const fetchTaskComments = async (taskId: string): Promise<ClickUpComment[]> => {
    const url = `${API_BASE}/task/${taskId}/comment`;
    try {
        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: getHeaders()
        }, 2, 500); // Faster fail
        
        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return Array.isArray(data.comments) ? data.comments : [];
    } catch (e) {
        return [];
    }
};

/**
 * Processes raw tasks into Projects (aggregated by FOLDER) with calculated statistics.
 */
export const processTasksIntoProjects = (tasks: ClickUpTask[]): ProjectData[] => {
    if (!tasks || !Array.isArray(tasks)) {
        return [];
    }

    // Map key is Group ID (Folder ID or List ID if no folder)
    const projectsMap = new Map<string, ProjectData>();

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDaysFromNow = now + (7 * oneDay);

    tasks.forEach(task => {
        // Safety check for essential fields
        if (!task || !task.list) return;

        // Determine grouping: Folder preferred, fallback to List
        let groupId = task.list.id;
        let groupName = task.list.name;
        let folderName = 'No Folder';

        if (task.folder && task.folder.id) {
            groupId = task.folder.id;
            groupName = task.folder.name;
            folderName = task.folder.name;
        } else {
            // Append (List) if it's a loose list to distinguish it
            groupName = `${task.list.name} (List)`;
        }
        
        if (!projectsMap.has(groupId)) {
            projectsMap.set(groupId, {
                id: groupId,
                name: groupName,
                folderName: folderName,
                spaceName: task.space?.id || 'Unknown Space', 
                tasks: [],
                stats: {
                    totalTasks: 0,
                    openTasks: 0,
                    completedTasks: 0,
                    overdueTasks: 0,
                    dueNext7Days: 0,
                    percentComplete: 0
                },
                riskLevel: 'Low', // Default
                recentComments: []
            });
        }

        const project = projectsMap.get(groupId)!;
        project.tasks.push(task);

        // Calc Stats
        const statusType = task.status?.type;
        const statusName = task.status?.status?.toLowerCase();
        
        const isClosed = statusType === 'closed' || statusName === 'complete' || statusName === 'closed';
        const dueDate = task.due_date ? parseInt(task.due_date, 10) : null;

        project.stats.totalTasks++;
        
        if (isClosed) {
            project.stats.completedTasks++;
        } else {
            project.stats.openTasks++;
            
            // Overdue check
            if (dueDate && dueDate < now) {
                project.stats.overdueTasks++;
            }

            // Due next 7 days
            if (dueDate && dueDate >= now && dueDate <= sevenDaysFromNow) {
                project.stats.dueNext7Days++;
            }
        }
    });

    // Finalize percentages and calculate Risk
    return Array.from(projectsMap.values()).map(p => {
        p.stats.percentComplete = p.stats.totalTasks > 0 
            ? Math.round((p.stats.completedTasks / p.stats.totalTasks) * 100) 
            : 0;

        // Calculate Risk Level
        if (p.stats.overdueTasks > 0) {
            p.riskLevel = 'High';
        } else if (p.stats.dueNext7Days > 0 && p.stats.percentComplete < 50) {
            p.riskLevel = 'Medium';
        } else {
            p.riskLevel = 'Low';
        }

        return p;
    }).sort((a, b) => {
        // Sort by risk first (High -> Low), then by open tasks
        const riskScore = { 'High': 3, 'Medium': 2, 'Low': 1 };
        const riskDiff = riskScore[b.riskLevel] - riskScore[a.riskLevel];
        if (riskDiff !== 0) return riskDiff;
        return b.stats.openTasks - a.stats.openTasks;
    });
};

/**
 * Intelligent Comment Fetching
 * 
 * Strategy:
 * 1. Identify tasks updated recently (last 30 days).
 * 2. Fetch comments for ALL of these tasks to ensure we capture all recent conversations.
 * 3. Aggregate comments back to the project.
 */
export const enrichProjectsWithComments = async (projects: ProjectData[]): Promise<ProjectData[]> => {
    const tasksToFetch: { taskId: string; projectIndex: number; taskName: string }[] = [];
    
    // Look back 30 days.
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    // 1. Identify candidate tasks
    projects.forEach((project, idx) => {
        const candidates = project.tasks.filter(t => {
            const updated = parseInt(t.date_updated);
            return updated > thirtyDaysAgo;
        });

        candidates.forEach(t => {
            tasksToFetch.push({ taskId: t.id, projectIndex: idx, taskName: t.name });
        });
    });

    // 2. Fetch comments in batches (Parallelized)
    // Optimized: Concurrency 6, Delay 50ms. Much more aggressive than before.
    const chunkSize = 6; 
    const results = [];
    
    for (let i = 0; i < tasksToFetch.length; i += chunkSize) {
        const chunk = tasksToFetch.slice(i, i + chunkSize);
        
        // Process chunk
        const chunkPromises = chunk.map(item => fetchTaskComments(item.taskId).then(comments => ({
            ...item,
            comments
        })));
        
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);

        // Minimal delay between chunks to let the proxy breathe slightly, but essentially near-instant
        if (i + chunkSize < tasksToFetch.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    // 3. Enrich Projects
    const enrichedProjects = projects.map(p => ({
        ...p,
        recentComments: [] as ClickUpComment[],
        tasks: p.tasks.map(t => ({...t, comments: [] as ClickUpComment[] }))
    }));

    results.forEach(res => {
        if (res.comments.length > 0) {
            const project = enrichedProjects[res.projectIndex];
            
            // Enrich the specific task in the project
            const task = project.tasks.find(t => t.id === res.taskId);
            if (task) {
                // Add task name to comment for context
                const contextualizedComments = res.comments.map(c => ({
                    ...c,
                    task_id: res.taskId,
                    task_name: res.taskName
                }));
                task.comments = contextualizedComments;
                
                // Add to project-wide comments
                project.recentComments.push(...contextualizedComments);
            }
        }
    });

    // 4. Final Sort
    enrichedProjects.forEach(p => {
        p.recentComments.sort((a, b) => parseInt(b.date) - parseInt(a.date));
        if (p.recentComments.length > 0) {
            p.latestComment = p.recentComments[0];
        }
    });

    return enrichedProjects;
};