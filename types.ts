// ClickUp API Interfaces

export interface ClickUpStatus {
    status: string;
    color: string;
    type: string; // 'open', 'custom', 'closed'
    orderindex: number;
}

export interface ClickUpList {
    id: string;
    name: string;
    access: boolean;
}

export interface ClickUpFolder {
    id: string;
    name: string;
    hidden?: boolean;
}

export interface ClickUpSpace {
    id: string;
    name: string;
    private?: boolean;
    statuses?: ClickUpStatus[];
    multiple_assignees?: boolean;
}

export interface ClickUpComment {
    id: string;
    comment: Array<{ text: string }>; // Raw structure
    comment_text: string; // Flattened text
    user: {
        id: number;
        username: string;
        color: string;
        profilePicture: string;
    };
    resolved: boolean;
    date: string; // Unix timestamp in ms
    task_id?: string;
    task_name?: string; // Augmented for UI
}

export interface ClickUpTask {
    id: string;
    name: string;
    status: ClickUpStatus;
    orderindex: string;
    date_created: string;
    date_updated: string;
    date_closed: string | null;
    due_date: string | null; // Unix timestamp in ms as string
    start_date: string | null;
    list: ClickUpList;
    folder?: ClickUpFolder; // Folder containing the list
    space: ClickUpSpace;
    url: string;
    assignees: Array<{
        id: number;
        username: string;
        color: string;
        profilePicture: string;
    }>;
    comments?: ClickUpComment[]; // Optional attached comments
}

// Internal App Interfaces

export interface ProjectStats {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    overdueTasks: number;
    dueNext7Days: number;
    percentComplete: number;
}

export interface ProjectData {
    id: string;
    name: string;
    folderName?: string; // Name of the folder this project belongs to
    spaceName: string;
    tasks: ClickUpTask[];
    stats: ProjectStats;
    riskLevel: 'High' | 'Medium' | 'Low';
    latestComment?: ClickUpComment; // The single most recent comment
    recentComments: ClickUpComment[]; // List of recent comments for this project
}

export interface AIAnalysis {
    summary: string;
    topRisks: string[];
    actions: string[];
    emailDraft: string; // New field for email summary
}