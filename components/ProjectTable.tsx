import React from 'react';
import { ProjectData } from '../types';

interface ProjectTableProps {
    projects: ProjectData[];
    onSelectProject: (project: ProjectData) => void;
}

const ProjectTable: React.FC<ProjectTableProps> = ({ projects, onSelectProject }) => {
    
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

    return (
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-xs border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-4">Folder / Area</th>
                            <th className="px-6 py-4 text-center">Open Tasks</th>
                            <th className="px-6 py-4 text-center text-red-400">Overdue</th>
                            <th className="px-6 py-4 text-center text-amber-500">Due 7 Days</th>
                            <th className="px-6 py-4 text-center">Completion</th>
                            <th className="px-6 py-4">Latest Comment</th>
                            <th className="px-6 py-4 text-center">Risk</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {!projects || projects.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                    No folders found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            projects.map((project) => (
                                <tr 
                                    key={project.id} 
                                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                    onClick={() => onSelectProject(project)}
                                >
                                    <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">
                                        {project.name}
                                    </td>
                                    <td className="px-6 py-4 text-center font-medium">{project.stats.openTasks}</td>
                                    <td className={`px-6 py-4 text-center font-bold ${project.stats.overdueTasks > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                                        {project.stats.overdueTasks}
                                    </td>
                                    <td className={`px-6 py-4 text-center font-medium ${project.stats.dueNext7Days > 0 ? 'text-amber-500' : 'text-slate-600'}`}>
                                        {project.stats.dueNext7Days}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-xs font-semibold w-8 text-right text-slate-400">{project.stats.percentComplete}%</span>
                                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                                <div 
                                                    className={`h-full rounded-full ${
                                                        project.stats.percentComplete >= 100 ? 'bg-green-500' : 
                                                        project.stats.percentComplete > 50 ? 'bg-blue-500' : 'bg-slate-500'
                                                    }`} 
                                                    style={{ width: `${project.stats.percentComplete}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-[200px]">
                                        {project.latestComment ? (
                                            <div className="flex gap-2 items-start">
                                                <img 
                                                    src={project.latestComment.user.profilePicture || `https://ui-avatars.com/api/?name=${project.latestComment.user.username}`} 
                                                    alt={project.latestComment.user.username}
                                                    className="w-6 h-6 rounded-full border border-slate-600 mt-0.5 flex-shrink-0"
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs text-slate-400 truncate font-medium">
                                                        {project.latestComment.user.username} <span className="text-slate-600 mx-1">•</span> {formatTimeAgo(project.latestComment.date)}
                                                    </span>
                                                    <p className="text-xs text-slate-300 truncate w-full" title={project.latestComment.comment_text}>
                                                        "{project.latestComment.comment_text}"
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600 italic">No recent comments</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                                            ${project.riskLevel === 'High' ? 'bg-red-900/30 text-red-300 border-red-900/50' : 
                                              project.riskLevel === 'Medium' ? 'bg-amber-900/30 text-amber-300 border-amber-900/50' : 
                                              'bg-green-900/30 text-green-300 border-green-900/50'}`}>
                                            {project.riskLevel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold px-3 py-1 bg-cyan-900/20 border border-cyan-900/40 rounded-md group-hover:bg-cyan-900/40 transition-colors">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProjectTable;