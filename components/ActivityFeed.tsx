import React from 'react';
import { ProjectData, ClickUpComment } from '../types';

interface ActivityFeedProps {
    projects: ProjectData[];
    loading: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ projects, loading }) => {
    
    const formatTimeAgo = (timestampStr: string) => {
        const timestamp = parseInt(timestampStr, 10);
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    };

    // Filter for comments in the "Current Week" (starting Monday)
    const getStartOfWeek = () => {
        const d = new Date();
        const day = d.getDay(); // 0 is Sunday
        // Calculate difference to get to Monday (1)
        // If Sunday (0), go back 6 days to get previous Monday.
        // If Monday (1), go back 0 days.
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        start.setHours(0, 0, 0, 0);
        return start;
    };

    const startOfWeek = getStartOfWeek();
    const startOfWeekMs = startOfWeek.getTime();
    const startOfWeekStr = startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    // Helper to get weekly comments for a specific project
    const getProjectWeeklyComments = (project: ProjectData) => {
        if (!project.recentComments) return [];
        return project.recentComments.filter(c => {
            const cDate = parseInt(c.date, 10);
            return cDate >= startOfWeekMs;
        });
    };

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Weekly Folder Updates
                    <span className="text-sm font-normal text-slate-500 ml-1">(Since {startOfWeekStr})</span>
                </h3>
            </div>

            {loading && projects.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-slate-900 rounded-xl p-6 h-64 border border-slate-800">
                            <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
                            <div className="space-y-4">
                                <div className="h-4 bg-slate-800 rounded w-full"></div>
                                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map((project) => {
                        const weeklyComments = getProjectWeeklyComments(project);
                        
                        return (
                            <div key={project.id} className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col h-[400px]">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center rounded-t-xl">
                                    <h4 className="font-bold text-slate-200 truncate pr-4 text-lg">
                                        {project.name}
                                    </h4>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${weeklyComments.length > 0 ? 'bg-cyan-900/30 text-cyan-300 border-cyan-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                        {weeklyComments.length} updates
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-950/30">
                                    {weeklyComments.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm italic">
                                            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            No updates this week
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {weeklyComments.map((comment) => (
                                                <div key={comment.id} className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <img
                                                            className="h-6 w-6 rounded-full ring-1 ring-slate-700"
                                                            src={comment.user.profilePicture || `https://ui-avatars.com/api/?name=${comment.user.username}`}
                                                            alt={comment.user.username}
                                                        />
                                                        <span className="text-xs font-bold text-slate-300">
                                                            {comment.user.username}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 ml-auto">
                                                            {formatTimeAgo(comment.date)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-cyan-500/80 font-medium mb-1 truncate">
                                                        Re: {comment.task_name}
                                                    </div>
                                                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                        "{comment.comment_text}"
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ActivityFeed;